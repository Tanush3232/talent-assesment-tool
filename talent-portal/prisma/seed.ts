import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { PrismaClient, UserRole, AssessmentStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // ── Create Admin User ──────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@adventz.com" },
    update: {},
    create: {
      email: "admin@adventz.com",
      name: "System Administrator",
      role: UserRole.ADMIN,
      designation: "System Administrator",
      department: "IT",
      location: "Bengaluru Outer Ring Road CoE",
      isActive: true,
    },
  });
  console.log("✅ Admin created:", admin.email);

  // ── Create HR User ─────────────────────────────────────────────────────────
  const hr = await prisma.user.upsert({
    where: { email: "hr@adventz.com" },
    update: {},
    create: {
      email: "hr@adventz.com",
      name: "Shaik Mohammed Siddiq",
      role: UserRole.HR,
      designation: "Lead - Talent Management",
      department: "Human Resources",
      location: "Bengaluru Outer Ring Road CoE",
      isActive: true,
    },
  });
  console.log("✅ HR created:", hr.email);

  // ── Create Manager Users ───────────────────────────────────────────────────
  const manager1 = await prisma.user.upsert({
    where: { email: "sandeep.sharma@adventz.com" },
    update: {},
    create: {
      id: "MGR001",
      email: "sandeep.sharma@adventz.com",
      name: "Sandeep Sharma",
      role: UserRole.MANAGER,
      designation: "VP Engineering",
      department: "Engineering & R&D",
      location: "Bengaluru Outer Ring Road CoE",
      isActive: true,
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { email: "divya.nair@adventz.com" },
    update: {},
    create: {
      id: "MGR002",
      email: "divya.nair@adventz.com",
      name: "Divya Nair",
      role: UserRole.MANAGER,
      designation: "Director - Business Enablement",
      department: "Business Enablement",
      location: "Mumbai BKC Head Office",
      isActive: true,
    },
  });

  const manager3 = await prisma.user.upsert({
    where: { email: "priya.krishnamurthy@adventz.com" },
    update: {},
    create: {
      id: "MGR003",
      email: "priya.krishnamurthy@adventz.com",
      name: "Priya Krishnamurthy",
      role: UserRole.MANAGER,
      designation: "Head of Product",
      department: "Product Management",
      location: "Bengaluru Outer Ring Road CoE",
      isActive: true,
    },
  });
  console.log("✅ Managers created");

  // ── Create Sample Employees ────────────────────────────────────────────────
  const employees = [
    {
      id: "EMP001",
      name: "Arjun Mehta",
      email: "arjun.mehta@adventz.com",
      designation: "Senior Software Engineer",
      impactLevel: "High",
      entity: "Adventz Corporate CoE",
      department: "Engineering & R&D",
      function: "Technology" as string | null,
      location: "Bengaluru Outer Ring Road CoE",
      managerId: "MGR001",
      managerName: "Sandeep Sharma",
      managerEmail: "sandeep.sharma@adventz.com",
    },
    {
      id: "EMP002",
      name: "Sneha Patel",
      email: "sneha.patel@adventz.com",
      designation: "Product Manager",
      impactLevel: "Critical",
      entity: "Adventz Corporate CoE",
      department: "Product Management",
      function: "Product",
      location: "Bengaluru Outer Ring Road CoE",
      managerId: "MGR003",
      managerName: "Priya Krishnamurthy",
      managerEmail: "priya.krishnamurthy@adventz.com",
    },
    {
      id: "EMP003",
      name: "Rahul Verma",
      email: "rahul.verma@adventz.com",
      designation: "UX Designer",
      impactLevel: "Medium",
      entity: "Zuari Industries Ltd",
      department: "Design Studio",
      function: "Technology",
      location: "Mumbai BKC Head Office",
      managerId: "MGR002",
      managerName: "Divya Nair",
      managerEmail: "divya.nair@adventz.com",
    },
    {
      id: "EMP004",
      name: "Kavitha Suresh",
      email: "kavitha.suresh@adventz.com",
      designation: "Engineering Lead",
      impactLevel: "High",
      entity: "Adventz Corporate CoE",
      department: "Engineering & R&D",
      function: "Technology",
      location: "Hyderabad HITEC City",
      managerId: "MGR001",
      managerName: "Sandeep Sharma",
      managerEmail: "sandeep.sharma@adventz.com",
    },
    {
      id: "EMP005",
      name: "Vikram Singh",
      email: "vikram.singh@adventz.com",
      designation: "Sales Manager",
      impactLevel: "High",
      entity: "Zuari Industries Ltd",
      department: "Sales & Commercial",
      function: "Commercial",
      location: "Pune EON IT Park",
      managerId: "MGR002",
      managerName: "Divya Nair",
      managerEmail: "divya.nair@adventz.com",
    },
  ];

  // Demo roster under MGR001 (Sandeep Sharma) so all 3 statuses show up in the manager view:
  //   EMP001 Arjun Mehta -> COMPLETED, EMP006 Neha Kulkarni -> DRAFT, EMP007 Rohan Desai -> PENDING (no assessment row)
  employees.push(
    {
      id: "EMP006",
      name: "Neha Kulkarni",
      email: "neha.kulkarni@adventz.com",
      designation: "Software Engineer",
      impactLevel: "Medium",
      entity: "Adventz Corporate CoE",
      department: "Engineering & R&D",
      function: "Technology" as string | null,
      location: "Bengaluru Outer Ring Road CoE",
      managerId: "MGR001",
      managerName: "Sandeep Sharma",
      managerEmail: "sandeep.sharma@adventz.com",
    },
    {
      id: "EMP007",
      name: "Rohan Desai",
      email: "rohan.desai@adventz.com",
      designation: "QA Engineer",
      impactLevel: "Medium",
      entity: "Adventz Corporate CoE",
      department: "Engineering & R&D",
      function: null,
      location: "Bengaluru Outer Ring Road CoE",
      managerId: "MGR001",
      managerName: "Sandeep Sharma",
      managerEmail: "sandeep.sharma@adventz.com",
    }
  );

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: {},
      create: { ...emp, createdBy: admin.id },
    });
  }
  console.log("✅ Sample employees created");

  // ── Create sample assessment for EMP001 (COMPLETED) ───────────────────────
  await prisma.assessment.upsert({
    where: { employeeId: "EMP001" },
    update: {},
    create: {
      employeeId: "EMP001",
      cycle: "FY2026",
      status: AssessmentStatus.COMPLETED,
      scores: {
        ability: { "1.1": 4, "1.2": 3, "1.3": 4, "1.4": 3 },
        aspiration: { "2.1": 4, "2.2": 4, "2.3": 3, "2.4": 4 },
        leadership: { "3.1": 3, "3.2": 4, "3.3": 3, "3.4": 4 },
      },
      evidence: {
        "1.1": "Arjun demonstrated exceptional agility by picking up a completely new microservices architecture in under two weeks and contributing meaningfully to the team's delivery timelines.",
        "1.2": "Consistently leverages AI tools and data analytics to automate testing pipelines, reducing regression time by 35% over the last quarter.",
        "1.3": "Identified a critical cross-department bottleneck in the payment gateway integration and proposed a scalable solution that was adopted across three teams.",
        "1.4": "Known for de-escalating conflict within the team during a high-pressure delivery sprint, maintaining team morale and focus throughout.",
        "2.1": "Proactively requested assignment to a stretch project outside his core domain, delivering excellent results while mentoring two junior engineers.",
        "2.2": "Clearly expressed ambition to grow into an engineering manager role and has taken on informal leadership responsibilities to build toward that goal.",
        "2.3": "Maintained high output and positive attitude during the Q3 reorg which impacted his immediate team composition significantly.",
        "2.4": "Deeply aligned with the company's digital transformation agenda; regularly champions internal tech talks and contributes to the engineering excellence community.",
        "3.1": "Consistently volunteers for cross-functional initiatives beyond his job scope and brings infectious energy that lifts the entire team.",
        "3.2": "Successfully led a cross-functional task force without formal authority, achieving consensus across product, design, and backend teams.",
        "3.3": "Acts as a brand ambassador in external hackathons and is frequently referenced as a role model by newer team members.",
        "3.4": "Has structured a weekly peer learning session for engineers in his pod, resulting in measurably faster onboarding for new hires.",
      },
      managerComments:
        "Arjun is one of the strongest high-potential candidates in the engineering cohort. He demonstrates rare maturity in balancing technical excellence with people skills. He is ready for expanded scope and should be considered for the Engineering Manager track in the next review cycle. No significant derailers observed. Succession readiness: high.",
      submittedById: manager1.id,
      submittedAt: new Date(),
      lockedAt: new Date(),
      createdBy: manager1.id,
      updatedBy: manager1.id,
    },
  });
  console.log("✅ Sample completed assessment created for EMP001");

  // ── Create draft assessment for EMP002 ─────────────────────────────────────
  await prisma.assessment.upsert({
    where: { employeeId: "EMP002" },
    update: {},
    create: {
      employeeId: "EMP002",
      cycle: "FY2026",
      status: AssessmentStatus.DRAFT,
      scores: {
        ability: { "1.1": 3, "1.2": 4 },
        aspiration: {},
        leadership: {},
      },
      evidence: {
        "1.1": "Sneha quickly adapted to the new agile methodology and led the team successfully through two sprints with minimal support.",
        "1.2": "She has been evangelizing the use of product analytics tools across the entire product team and has trained 5 PMs on dashboarding.",
      },
      managerComments: "",
      createdBy: manager3.id,
      updatedBy: manager3.id,
    },
  });
  console.log("✅ Draft assessment created for EMP002");

  // ── Draft assessment for EMP006 (under MGR001, so the manager view shows a DRAFT) ──
  await prisma.assessment.upsert({
    where: { employeeId: "EMP006" },
    update: {},
    create: {
      employeeId: "EMP006",
      cycle: "FY2026",
      status: AssessmentStatus.DRAFT,
      scores: {
        ability: { "1.1": 3, "1.2": 3 },
        aspiration: {},
        leadership: {},
      },
      evidence: {
        "1.1": "Neha picked up the new CI pipeline tooling quickly and onboarded two teammates onto it without any hand-holding.",
        "1.2": "She regularly uses test automation and dashboards to catch regressions early and shares findings with the team.",
      },
      managerComments: "",
      createdBy: manager1.id,
      updatedBy: manager1.id,
    },
  });
  console.log("✅ Draft assessment created for EMP006");

  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
