import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ManagerDashboardClient from "@/components/dashboard/ManagerDashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // HR and Admin users go directly to the Global Talent Directory
  if (session.user.role === "HR" || session.user.role === "ADMIN") {
    redirect("/reports");
  }

  // Manager dashboard — fetch only their direct reports
  if (session.user.role === "MANAGER") {
    const employees = await prisma.employee.findMany({
      where: { managerEmail: session.user.email as string },
      include: { assessment: true },
      orderBy: { name: "asc" },
    });

    return (
      <ManagerDashboardClient
        employees={employees as any}
        managerName={session.user.name || "Manager"}
        managerDept={session.user.department || ""}
      />
    );
  }

  // Fallback
  redirect("/reports");
}
