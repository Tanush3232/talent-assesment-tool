// ─────────────────────────────────────────────────────────────────────────────
// GET /api/export/manager-employees?managerId=MGR001
// Returns: COMPLETED employees reporting to a specific manager
// Auth: HR or ADMIN only
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFullAssessmentResult } from "@/lib/scoring";

export async function GET(request: NextRequest) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "HR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const managerId = searchParams.get("managerId");

  if (!managerId) {
    return NextResponse.json({ error: "managerId is required" }, { status: 400 });
  }

  // ── Fetch COMPLETED assessments for this manager's direct reports ──────────
  const completedAssessments = await prisma.assessment.findMany({
    where: {
      status: "COMPLETED",
      employee: {
        isActive: true,
        managerId,
      },
    },
    include: {
      employee: true,
      submittedByUser: { select: { name: true } },
    },
    orderBy: { employee: { name: "asc" } },
  });

  // ── Resolve manager name ───────────────────────────────────────────────────
  const managerUser = await prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true, name: true },
  });
  const managerName = managerUser?.name;

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
      managerName: managerName || a.employee.managerEmail,
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

  return NextResponse.json({ employees });
}
