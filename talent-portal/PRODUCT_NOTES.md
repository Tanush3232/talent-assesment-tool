# Talent Assessment Portal — Product Decisions Log

> **Last updated:** 2026-07-06
> This file tracks all confirmed product decisions and business rules so they are never lost across sessions.

---

## Roles & Permissions

| Role | Access |
|---|---|
| `ADMIN` | Admin Center (user mgmt + full employee DB), can see everything |
| `HR` | Global Talent Directory (new HR page) + Reports & Calibration log export |
| `MANAGER` | "My Direct Reports" view only — can calibrate/assess their own team |

- **User roles remain**: `ADMIN | HR | MANAGER` (no new enum values)
- HR sub-types (Talent Head, HRBP) are designations within the `HR` role — no schema enum change.

---

## HR View — Business Rules

- **Page name:** "Global Talent Directory"
- **HR can ONLY view COMPLETED assessments.** 
  - PENDING → shows "AWAITING MANAGER" text, no button
  - DRAFT → shows "AWAITING MANAGER" text, no button  
  - COMPLETED → shows "View Assessment →" dark button
- This rule applies to the HR view only. Managers still see all statuses of their own team.

---

## HR View — Layout (from images confirmed 2026-07-06)

### Stat Bar (top)
- TOTAL DIRECTS (dark card), PENDING, DRAFTS, COMPLETED — all are clickable filter buttons

### Organizational Roll-up Summaries Table
- 3 tab views: **Function View | Department View | Manager View**
- Columns per view:
  - **Function View**: Business Function | Total Headcount | Calibration Progress | Validated HiPos | HiPo Density | Quick GCC Filter
  - **Department View**: same structure by department
  - **Manager View**: same structure by manager
- "Filter below" button in Quick GCC Filter column filters the main registry table

### Search & Filters (above main table)
- Search: "Search by name, role, department..."
- Filter dropdowns (all dynamic from actual DB data):
  - **FUNCTION**: All Functions
  - **DEPT**: All Depts
  - **MANAGER**: All Managers
  - **ENTITY**: All Entities
  - **HRBP**: All HRBPs
- Top-right: "FILTERS ACTIVE: Status: ALL" chip

### Main Registry Table Columns
- ID & EMPLOYEE (avatar + name + ID chip)
- ROLE & ORGANIZATION (designation + dept + entity)
- HRBP (name in blue, linked)
- REGION & LOCATION
- EVALUATION STATUS (badge: DRAFT=orange, PENDING=gray, COMPLETED=green)
- ACTIONS

---

## HRBP Field — Data Model

- `hrbpName String?` field to be added to `Employee` model in Prisma schema
- Every employee can have one HRBP assigned
- Must be added to bulk upload Excel template as a column
- HRBP dropdown filter is dynamic — populated from distinct `hrbpName` values in the DB

---

## Admin View — Business Rules

- Remove tab layout; unified view
- 4 stat filter buttons: Total Directory Records, Calibrated Profiles, Active Drafts, Pending Intake
- Full search across: Emp ID, Name, Email, Designation, Manager Name, Manager ID, Dept, Location
- All employee columns shown (horizontally scrollable): Emp ID, Name, Email, Designation, Impact Level, Employee Entity, Manager Name, Manager ID, Manager Email, Location, Department, Function, **HRBP**, Actions

---

## Manager View — Business Rules (from image 5)

- Page: "My Direct Reports"
- Subtitle shows dept and location context
- Stat row: TOTAL DIRECTS | PENDING | DRAFTS | COMPLETED (clickable filter buttons)
- Search bar + "FILTERS ACTIVE: Status: ALL" chip
- Table: ID & Employee | Role & Organization | Region & Location | Evaluation Status | Actions
- Actions:
  - PENDING or DRAFT → dark "Calibrate / Assess →" button
  - COMPLETED → outline "View Assessment →" button
- **COMPLETED assessments never show "Calibrate/Assess" for HR** (HR only sees View button)

---

## Manager Onboarding Modal (Q4 — PENDING)

- Multi-page (3-4 slides), uncloseable until last page
- Only shown to MANAGER role on first login (persisted in localStorage)
- **Content: TBD — user will provide images in next prompt**

---

## Export Calibration Log

Columns (exact, in order):
1. Employee ID
2. Employee Name
3. Role
4. Department
5. Location
6. Manager Name
7. Evaluation Status
8. Ability Subtotal
9. Aspiration Subtotal
10. Leadership Subtotal
11. Grand Total Score
12. Critical Low Scores Count
13. Final Talent Classification

Plus individual sub-dimension scores as additional columns (1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4)

---

## Charts

- Replace line chart → **Horizontal Bar Chart** for Talent Potential Distribution
- Shows: Well-placed | Promotable/Expandable | High Potential (HiPo) counts
- Zuari colors: Blue (HiPo) | Green (Promotable) | Red/Gray (Well-placed)

---

## Manager Onboarding Modal — 6-Step Tour (CONFIRMED ✅)

- **Trigger:** MANAGER role only, first login (persisted via `localStorage` key `manager_onboarding_done`)
- **Behaviour:** Cannot be closed or skipped — no X button. Only "Next Step" / "Back" navigation. Last page has "Got it, Start →" to dismiss.
- **Background highlight:** Each step spotlights a specific DOM element with a blue border/glow ring. Background is dimmed. Modal floats in front.
- **Element targeting:** Steps 2, 3, 4 use `data-tour` attributes on the actual DOM elements to apply a highlight ring. Steps 1, 5, 6 have no specific highlight.

### Step 1 — Welcome (no highlight)
- **Heading:** "Manager Workspace Onboarding Tour — Step 1 of 6"
- **Title:** "Welcome to your Calibration Workspace, {Manager Name}!"
- **Body:** "This interactive dashboard is your command center for assessing direct reports across the key corporate potential pillars: **Ability**, **Aspiration**, and **Leadership**."
- "Let's walk through the basic user interface steps first, then guide you directly into the theoretical guidelines and official calibration scales."
- **Footer:** Step 1 of 6 | Next Step >

### Step 2 — Roster Status Filtering (highlights: stat cards row)
- **Target element:** `data-tour="stat-cards"` (the Total Directs / Pending / Drafts / Completed row)
- **Heading:** "STEP 2: ROSTER STATUS FILTERING (HIGHLIGHTED BELOW)"
- **Body:** "Take a look at the highlighted row of metric cards at the top of your screen: **Total Directs**, **Pending**, **Drafts**, and **Completed**."
- "Clicking any of these cards instantly filters your team roster table. Focus on unfinished cards by selecting **Pending** or **Drafts**. Reset the roster filters by clicking **Total Directs**."
- **Footer:** < Back | Step 2 of 6 | Next Step >

### Step 3 — Real-Time Directory Search (highlights: search bar)
- **Target element:** `data-tour="search-bar"` (the search input)
- **Heading:** "STEP 3: REAL-TIME DIRECTORY SEARCH (HIGHLIGHTED BELOW)"
- **Body:** "Look at the search bar currently highlighted on your screen."
- "Type any part of a reportee's name, role designation, or office location (e.g., 'Bengaluru') to filter and pinpoint team listings dynamically as you type."
- **Footer:** < Back | Step 3 of 6 | Next Step >

### Step 4 — Launching Evaluations (highlights: full table)
- **Target element:** `data-tour="team-table"` (the employee roster table)
- **Heading:** "STEP 4: LAUNCHING EVALUATIONS (TABLE HIGHLIGHTED)"
- **Body:** "Look at the team directory table, where available actions are currently highlighted."
- "Clicking **"Calibrate / Assess"** launches the multi-step potential wizard. Once finalized, the form is locked securely from subsequent edits and transmitted to HR."
- **Footer:** < Back | Step 4 of 6 | Next Step >

### Step 5 — Guidelines (no highlight, scrollable)
- **Heading:** "Manager Workspace Onboarding Tour — Step 5 of 6"
- **Content heading:** "Guidelines"
- Q: "What is the purpose of this tool?"
- A box: "As a people manager, you will be able to assess the potential of your team members in a structured and consistent manner."
- Q: "What is talent potential?"
- A box: "Potential is the likelihood of an employee being able to move to and be successful in roles that are at higher responsibility levels in the organization (as compared to the current responsibility level that the employee is in)."
- Text: "The potential can be estimated by assessing the employee on the various behavioural indicators. They are as follows:"
- 3 pill buttons: **Ability** | **Aspiration** | **Leadership**
- **Footer:** < Back | Step 5 of 6 | Next Step >

### Step 6 — Calibration & Scoring Actions (no highlight)
- **Heading:** "Manager Workspace Onboarding Tour — Step 6 of 6"
- **Content heading:** "Calibration & Scoring Actions"
- **Intro:** "Manager assessment along with the evidence/justification needs to be discussed and calibrated in the leadership team to ensure a higher level of validity."
- **Sub-heading:** "Scale Reference (1–4 Scale)"
- **Instruction:** "Based on your observations, please evaluate the employee on each of the behaviour using the following 1–4 scale and provide the examples of employee's behaviour that you have observed to support the rating:"
- Scale table:
  - 1 = Rarely or never displays the behaviour
  - 2 = Demonstrates the behaviour sometimes
  - 3 = Demonstrates the behaviour most of the time
  - 4 = Demonstrates the behaviour consistently/role models the behaviour
- **Sub-heading:** "The actions from you as people manager is to:"
- Bullet: "Rating on a scale of 1-4 as per definitions mentioned above"
- Bullet: "Provide evidences and examples pertaining to each Sub-dimensions & Behavioural Indicators"
- **Footer:** < Back | Step 6 of 6 | **"Got it, Start →"** (closes modal, sets localStorage flag)

---

## Pending Decisions

- ~~Q4: Manager onboarding modal~~ ✅ RESOLVED
- All decisions confirmed. Ready to implement.
