import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import AssessmentForm from "@/components/assessment/AssessmentForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function AssessmentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      assessment: true,
    }
  });

  if (!employee) {
    notFound();
  }

  // RBAC checks
  const isManager = session.user.email === employee.managerEmail;
  const isHrOrAdmin = session.user.role === "HR" || session.user.role === "ADMIN";

  if (!isManager && !isHrOrAdmin) {
    redirect("/dashboard");
  }

  const isReadOnly = (employee.assessment?.status === "COMPLETED" && !isHrOrAdmin) || (isHrOrAdmin && session.user.email !== employee.managerEmail);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link 
          href="/dashboard" 
          className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Talent Assessment</h1>
          <p className="text-slate-500 text-sm">FY2026 Evaluation Cycle</p>
        </div>
      </div>

      <AssessmentForm 
        employee={employee} 
        initialData={employee.assessment} 
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
