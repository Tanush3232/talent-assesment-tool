import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminPageClient from "@/components/admin/AdminPageClient";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  const employees = await prisma.employee.findMany({
    include: {
      assessment: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Resolve manager names
  const managerIds = [...new Set(employees.map(e => e.managerId))];
  const managers = await prisma.user.findMany({
    where: { id: { in: managerIds } },
    select: { id: true, name: true },
  });
  const managerMap = Object.fromEntries(managers.map(m => [m.id, m.name]));

  const enrichedEmployees = employees.map(e => ({
    ...e,
    managerName: managerMap[e.managerId] || e.managerEmail,
  }));

  return (
    <AdminPageClient
      users={users as any}
      employees={enrichedEmployees as any}
    />
  );
}
