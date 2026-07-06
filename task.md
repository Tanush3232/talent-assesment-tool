# Zuari Talent Assessment Portal - Build Tasks

## Phase 1 — Project Scaffolding
- [/] Init Next.js 15 project
- [ ] Install all dependencies
- [ ] Setup Tailwind + shadcn/ui
- [ ] Configure Prisma + PostgreSQL (port 5433)
- [ ] Setup NextAuth v5 + Azure AD stub
- [ ] .env.example + .env.local

## Phase 2 — Database + Auth
- [ ] Write complete schema.prisma
- [ ] Run prisma migrate dev
- [ ] Seed script
- [ ] Login page (Microsoft SSO UI)
- [ ] RBAC middleware
- [ ] Session handling (12hr expiry)

## Phase 3 — Manager Flow
- [ ] Manager dashboard
- [ ] Employee table with status filters
- [ ] 5-step assessment wizard
- [ ] Save draft + 30s autosave
- [ ] Submit + lock with confirmation dialog
- [ ] Guidelines modal + low score modal

## Phase 4 — HR Flow
- [ ] HR directory with filters
- [ ] Org roll-up tabs (function/dept/manager)
- [ ] Reports page + SVG chart
- [ ] Dynamic location density panel
- [ ] Talent registry table
- [ ] Export dropdown (Excel + PDF per employee + all under manager)

## Phase 5 — Admin Flow
- [ ] Admin workspace
- [ ] Add Employee modal (from screenshot)
- [ ] Bulk upload modal (CSV paste + Excel file, from screenshot)
- [ ] Download Excel template (dynamic columns)
- [ ] Add User modal (Admin/Manager/HR)
- [ ] Bulk upload users
- [ ] Edit + delete employee/user

## Phase 6 — Polish + APIs
- [ ] All REST API routes
- [ ] PDF generation (single + clubbed)
- [ ] Excel export
- [ ] Audit log (submission events)
- [ ] Skeleton loaders
- [ ] Empty states + error boundaries
- [ ] Mobile responsiveness
