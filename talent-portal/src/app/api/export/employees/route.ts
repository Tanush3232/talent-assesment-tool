// ─────────────────────────────────────────────────────────────────────────────
// GET /api/export/employees
// Returns: all active employees with COMPLETED assessments + all MANAGER users
// Auth: HR or ADMIN only
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFullAssessmentResult } from "@/lib/scoring";

export async function GET() {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "HR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Fetch COMPLETED assessments with employee data ─────────────────────────
  const completedAssessments = await prisma.assessment.findMany({
    where: {
      status: "COMPLETED",
      employee: { isActive: true },
    },
    include: {
      employee: true,
      submittedByUser: { select: { name: true } },
    },
    orderBy: { employee: { name: "asc" } },
  });

  // ── Resolve manager names ──────────────────────────────────────────────────
  const managerIds = [...new Set(completedAssessments.map((a) => a.employee.managerId))];
  const managerUsers = await prisma.user.findMany({
    where: { id: { in: managerIds } },
    select: { id: true, name: true },
  });
  const managerMap = Object.fromEntries(managerUsers.map((m) => [m.id, m.name]));

  // ── Enrich with computed scoring result ────────────────────────────────────
  const employees = completedAssessments.map((a) => {
    const scores = (a.scores || {}) as any;
    const computed = computeFullAssessmentResult(scores);
    return {
      id: a.employee.id,
      name: a.employee.name,
      designation: a.employee.designation,
      department: a.employee.department,
      entity: a.employee.entity,
      location: a.employee.location,
      managerId: a.employee.managerId,
      managerName: managerMap[a.employee.managerId] || a.employee.managerEmail,
      managerEmail: a.employee.managerEmail,
      hrbpName: a.employee.hrbpName,
      impactLevel: a.employee.impactLevel,
      assessment: {
        id: a.id,
        status: "COMPLETED" as const,
        scores: (a.scores || {}) as any,
        evidence: (a.evidence || {}) as any,
        managerComments: a.managerComments,
        classification: a.classification,
        isHiPoException: a.isHiPoException,
        cycle: a.cycle,
        submittedAt: a.submittedAt?.toISOString() ?? null,
        computedResult: {
          abilitySum: computed.abilitySum,
          aspirationSum: computed.aspirationSum,
          leadershipSum: computed.leadershipSum,
          grandTotal: computed.grandTotal,
          classificationCategory: computed.classification.category,
          classificationDescription: computed.classification.description,
          isHiPoException: computed.classification.isHiPoException ?? false,
        },
      },
    };
  });

  // ── Fetch ALL MANAGER users for the manager dropdown ──────────────────────
  const managers = await prisma.user.findMany({
    where: { role: "MANAGER", isActive: true },
    select: { id: true, name: true, email: true, designation: true, department: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ employees, managers });
}
