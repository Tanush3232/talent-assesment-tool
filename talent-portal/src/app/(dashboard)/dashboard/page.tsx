import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ManagerDashboardClient from "@/components/dashboard/ManagerDashboardClient";
import AdminDashboardClient from "@/components/dashboard/AdminDashboardClient";
import { computeFullAssessmentResult } from "@/lib/scoring";

async function getDashboardData(userId: string, role: string, userEmail: string) {
  if (role === "MANAGER") {
    const employees = await prisma.employee.findMany({
      where: { managerEmail: userEmail },
      include: { assessment: true },
      orderBy: { name: "asc" },
    });
    return { employees };
  } else {
    const totalEmployees = await prisma.employee.count();
    const assessments = await prisma.assessment.groupBy({
      by: ["status"],
      _count: true,
    });

    const stats = {
      total: totalEmployees,
      completed: assessments.find(a => a.status === "COMPLETED")?._count || 0,
      drafts: assessments.find(a => a.status === "DRAFT")?._count || 0,
    };
    const notStarted = stats.total - (stats.completed + stats.drafts);

    const recentAssessments = await prisma.assessment.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: { employee: true, submittedByUser: true },
    });

    const completed = await prisma.assessment.findMany({
      where: { status: "COMPLETED" },
      select: { scores: true },
    });

    const distribution = {
      hipo: 0,
      promotable: 0,
      wellPlaced: 0,
    };

    completed.forEach(a => {
      const res = computeFullAssessmentResult((a.scores || {}) as any);
      if (res.classification.category === "High Potential (HiPo)") distribution.hipo++;
      else if (res.classification.category === "Promotable/Expandable") distribution.promotable++;
      else distribution.wellPlaced++;
    });

    return { stats, notStarted, recentAssessments, distribution };
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await getDashboardData(
    session.user.id,
    session.user.role as string,
    session.user.email as string
  );

  if (session.user.role === "MANAGER") {
    return (
      <ManagerDashboardClient
        employees={data.employees as any}
        managerName={session.user.name || "Manager"}
        managerDept={session.user.department || ""}
      />
    );
  }

  return <AdminDashboardClient data={data} />;
}
