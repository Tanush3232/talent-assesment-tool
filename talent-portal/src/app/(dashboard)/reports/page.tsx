import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import HRDirectoryClient from "@/components/reports/HRDirectoryClient";
import ExportCalibrationLog from "@/components/reports/ExportCalibrationLog";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "HR" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all employees with their assessments and manager info
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: {
      assessment: {
        select: {
          id: true,
          status: true,
          scores: true,
          isHiPoException: true,
          submittedById: true,
          submittedByUser: { select: { name: true } },
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

  // For calibration log export — only completed assessments with full scoring detail
  const completedAssessments = await prisma.assessment.findMany({
    where: { status: "COMPLETED" },
    include: {
      employee: true,
      submittedByUser: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Global Talent Directory
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Consolidated view of all{" "}
            <span className="text-zuari-blue font-semibold">
              active departmental units
            </span>{" "}
            across regional centers.
          </p>
        </div>
        <ExportCalibrationLog data={completedAssessments as any} />
      </div>

      <HRDirectoryClient employees={enrichedEmployees as any} />
    </div>
  );
}
