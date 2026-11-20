# Talent Assessment Portal — Architecture, Local Dev & AWS Lightsail Runbook

> **Purpose:** Reference guide for running `talent-portal` locally, redeploying safely to AWS Lightsail, and making surgical code changes without breaking existing invariants.

---

## 1. Tech Stack & Project Structure

- **Framework:** Next.js `16.2.10` (App Router), React `19.2.4`, TypeScript, Tailwind CSS v4 + shadcn/ui
- **Database & ORM:** PostgreSQL + Prisma `7.8.0` (`@prisma/adapter-pg` + `pg.Pool`, configured via `prisma.config.ts` and `src/lib/prisma.ts`)
- **Authentication:** NextAuth.js v5 (`next-auth: ^5.0.0-beta.31`) with **Microsoft Entra ID (Azure AD)** SSO and dev **Credentials** login
- **Exports:** `exceljs` (Calibration Log & Excel), `@react-pdf/renderer` + `jszip` (client-side PDF & ZIP generation)
- **App Root:** `talent-portal/`

---

## 2. Running Locally

### Prerequisites
- Node.js **v20**
- PostgreSQL running locally (configured on port **`5433`** in local `.env` / Docker mapping, vs `5432` in prod)

### Environment Variables (`talent-portal/.env` and `.env.local`)
NextAuth v5 uses `AUTH_*` keys (note: `.env.example` still shows legacy `NEXTAUTH_*` names, but `src/lib/auth.ts` uses v5):
- `DATABASE_URL` — e.g. `postgresql://<user>:<pass>@localhost:5433/<db>?schema=public`
- `AUTH_SECRET` — random secret
- `AUTH_URL` — `http://localhost:3000`
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000`
- `AUTH_MICROSOFT_ENTRA_ID_ID`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID`
- `AUTH_MICROSOFT_ENTRA_ID_ISSUER`

### Commands (run inside `talent-portal/`)
```bash
npm install
npx prisma generate
npx prisma migrate dev      # applies migrations locally
npm run db:seed             # seeds initial users/employees (ts-node prisma/seed.ts)
npm run dev                 # starts Next.js dev server at http://localhost:3000
```

Other useful scripts:
- `npm run build` — production build (`npx prisma generate` must run before this)
- `npm run start` — run production build
- `npm run lint` — ESLint
- `npm run db:studio` — Prisma Studio

### Local Dev Login ("Dummy Login" Credentials Provider)
Password for all dev accounts is `1234`:
- **Admin:** `admin` (`admin@adventz.com`)
- **HR:** `hr` (`hr@adventz.com`)
- **Manager:** `manager` (`sandeep.sharma@adventz.com`)

---

## 3. AWS Lightsail Production Deployment & Redeploy

### Production Architecture
- **Server:** AWS Lightsail Ubuntu (20.04 / 22.04 LTS)
- **Runtime:** Node.js v20
- **Process Manager:** PM2 (`pm2 save` + `pm2 startup`) running `npm run start` on `http://localhost:3000`
- **Database:** PostgreSQL on port `5432` (dedicated DB and user)
- **Reverse Proxy:** Nginx (`talent-portal/nginx.conf`) listening on 80/443, forwarding to `http://localhost:3000` with gzip (level 4), WebSocket upgrade headers, and caching for `/_next/static/` & `/static/`
- **Domain & SSL:** `Potentialassessment.zuarione.com` with Let's Encrypt (`certbot --nginx`, HTTP → HTTPS redirect)

### Routine Redeploy Sequence (Zero Data Loss)
SSH into the Lightsail instance, navigate to the app directory (`talent-portal/`), and run:
```bash
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed              # optional & idempotent (uses upsert); adds/updates demo users & employees
npm run build
pm2 restart talent-portal    # verify exact PM2 process name with `pm2 list`
```

### Critical Production Rules
1. **NEVER run `npx prisma migrate dev` in production** — it can drop tables and reset data. Always use `npx prisma migrate deploy`.
2. **Always run `npx prisma generate` before `npm run build`**, otherwise TypeScript/Next.js build will fail on Prisma types.
3. Ensure production `.env` has `AUTH_URL="https://Potentialassessment.zuarione.com"`, `NEXT_PUBLIC_APP_URL="https://Potentialassessment.zuarione.com"`, a strong `AUTH_SECRET` (`openssl rand -base64 32`), production `DATABASE_URL` (`localhost:5432`), and production Entra ID credentials.
4. If Nginx config (`talent-portal/nginx.conf`) changes: update `/etc/nginx/sites-available/...`, test with `sudo nginx -t`, and reload via `sudo systemctl restart nginx`.

---

## 4. Core Architecture & Invariants (For Surgical Changes)

### A. Database Schema (`prisma/schema.prisma`)
- **Enums:** `UserRole` (`ADMIN`, `HR`, `MANAGER`), `AssessmentStatus` (`PENDING`, `DRAFT`, `COMPLETED`)
- **`User`:** Portal accounts (`id`, `azureOid` unique, `email` unique, `name`, `role`, `designation`, `department`, `location`, `avatarInitial`, `isActive`, `managerId`).
- **`Employee`:** Assessed staff (`id` string PK e.g. `EMP001`, `name`, `email` unique, `designation`, `impactLevel`, `entity`, `department`, `location`, `managerId`, `managerEmail`, `hrbpName`, `isActive`).
- **`Assessment`:** 1:1 per employee (`employeeId` unique FK, `cycle` default `"FY2026"`, `status`, `scores` Json, `evidence` Json, `managerComments`, `classification`, `isHiPoException`, `submittedById`, `submittedAt`, `lockedAt`).
- **`Draft`:** Autosave snapshots (`assessmentId`, `scores`, `evidence`, `managerComments`, `savedById`).
- **`AuditLog`:** Tracks `CREATE`/`UPDATE`/`DELETE`/`SUBMIT`/`SAVE_DRAFT` on `Assessment`/`Employee`/`User`.

### B. Auth & Route Protection (`src/lib/auth.ts`, `src/proxy.ts`)
- JWT session (`maxAge: 43200` / 12h, `trustHost: true`).
- `signIn` callback strictly whitelists against `prisma.user` by email (`not_registered` or `suspended` on failure) and binds `azureOid` on first Entra ID login.
- `src/proxy.ts` (Next.js middleware):
  - Protects `/dashboard`, `/reports`, `/admin`, `/assessment`.
  - `/admin` → `ADMIN` only.
  - `/reports` (and `/reports/analytics`) → `HR` or `ADMIN`.
  - `/login` or `/` when authenticated → redirects to `/dashboard` (which routes `HR`/`ADMIN` to `/reports`).

### C. Scoring & Classification (`src/lib/scoring.ts`)
- **3 Pillars × 4 Sub-dimensions (12 total):** `1.1–1.4` (Ability), `2.1–2.4` (Aspiration), `3.1–3.4` (Leadership).
- **Scale:** Integer `1–4` per sub-dimension. Section sum: `4–16`. Grand Total: `12–48` (`0` if unrated).
- **Categories:** `37–48` = `High Potential (HiPo)`, `24–36` = `Promotable/Expandable`, `12–23` = `Well-placed`, `0` = `Pending Rating`.
- **HiPo Exception Invariant:** If Grand Total `>= 37` AND `>= 3` sub-dimensions are rated `< 3` (1 or 2), category is downgraded to `Promotable/Expandable` and `isHiPoException: true` is persisted.

### D. Frontend & Business Rules
- **HR Visibility Rule:** HR can only view `COMPLETED` assessments (`PENDING`/`DRAFT` show `"AWAITING MANAGER"` with no action button).
- **Assessment Form (`src/components/assessment/AssessmentForm.tsx`):**
  - 5-step gated wizard (`guidelines` → `ability` → `aspiration` → `leadership` → `overall`), auto-saves every 30s, locks read-only on `COMPLETED`.
  - `selectedScores` is kept in React state (NOT React Hook Form path watchers) because RHF treats dotted keys (`"1.1"`) as nested paths.
- **Export Report Center (`src/components/export-report-center/`):**
  - Fetches JSON from `/api/export/employees` and `/api/export/manager-employees?managerId=...` (HR/Admin only).
  - Generates PDFs (`EmployeeAppraisalTemplate`, `ManagerCombinedTemplate`) and ZIPs strictly **client-side** via `@react-pdf/renderer` and `jszip`.

### E. Known Gotchas to Watch Out For
1. **Validation Mismatch (`validators.ts` vs `constants.ts`):** `validators.ts` enforces evidence `40–150` chars and comments `40–100` chars (matching `AssessmentForm.tsx`), whereas `constants.ts` defines `MIN_EVIDENCE_CHARS = 100`, `MIN_COMMENTS_CHARS = 100`, `MAX_COMMENTS_CHARS = 1000`.
2. **Employee ID Schema Mismatch:** `src/app/actions/employee.ts` uses a local `employeeSchema` allowing any non-empty string ID (`min(1)`), whereas `validators.ts` requires `/^[A-Z0-9]+$/`.
3. **Assessment Server Actions Auth Gap:** `saveAssessmentDraft` and `submitAssessment` in `src/app/actions/assessment.ts` only check `session?.user` exists — they do not verify manager ownership (`employee.managerId`) or role.
4. **Revalidation:** `saveAssessmentDraft` does not call `revalidatePath`; `submitAssessment` revalidates `/dashboard` and `/assessment/${employeeId}`.
5. **Legacy Export (`src/lib/exportUtils.tsx`):** `exportToExcel` references legacy fields (`overallScore`, `hipoStatus`, `promotability`, `wellPlaced`) that don't exist on `Assessment`; `ExportCalibrationLog.tsx` is the active Excel exporter.
6. **Next.js 16 / React 19:** `AGENTS.md` notes Next.js 16+ breaking API conventions — check before using older Next.js patterns.
