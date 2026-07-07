import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ReportsAnalyticsClient from "@/components/reports/ReportsAnalyticsClient";

export default async function ReportsAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "HR" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all active employees with their assessments
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: {
      assessment: {
        select: {
          id: true,
          status: true,
          scores: true,
          classification: true,
          isHiPoException: true,
          managerComments: true,
          submittedById: true,
          submittedByUser: { select: { name: true } },
          updatedAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Resolve manager names from User table
  const managerIds = [...new Set(employees.map((e) => e.managerId))];
  const managers = await prisma.user.findMany({
    where: { id: { in: managerIds } },
    select: { id: true, name: true },
  });
  const managerMap = Object.fromEntries(managers.map((m) => [m.id, m.name]));

  const enrichedEmployees = employees.map((emp) => ({
    ...emp,
    managerName: managerMap[emp.managerId] || emp.managerEmail,
    assessment: emp.assessment
      ? {
          ...emp.assessment,
          scores: emp.assessment.scores as any,
        }
      : null,
  }));

  // Fetch completed assessments for enhanced export
  const completedAssessments = await prisma.assessment.findMany({
    where: { status: "COMPLETED" },
    include: {
      employee: true,
      submittedByUser: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Enrich with manager name
  const enrichedCompleted = completedAssessments.map((a) => ({
    ...a,
    managerName:
      managerMap[a.employee.managerId] || a.employee.managerEmail,
    scores: a.scores as any,
  }));

  return (
    <ReportsAnalyticsClient
      employees={enrichedEmployees as any}
      completedAssessments={enrichedCompleted as any}
    />
  );
}
