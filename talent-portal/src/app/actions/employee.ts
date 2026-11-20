"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const employeeSchema = z.object({
  id: z.string().trim().min(1, "Employee ID is required"),
  name: z.string().trim().min(1, "Employee Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  designation: z.string().trim().min(1, "Designation is required"),
  impactLevel: z.string().trim().min(1, "Impact Level is required"),
  entity: z.string().trim().min(1, "Entity is required"),
  department: z.string().trim().min(1, "Department is required"),
  location: z.string().trim().min(1, "Location is required"),
  managerId: z.string().trim().min(1, "Manager ID is required"),
  managerEmail: z.string().trim().toLowerCase().email("Invalid manager email"),
  hrbpName: z.string().trim().optional(),
});

type EmployeeInput = z.infer<typeof employeeSchema>;

const refresh = () => {
  ["/admin", "/dashboard", "/reports", "/reports/analytics"].forEach((p) => revalidatePath(p));
};

async function requireAdmin() {
  const session = await auth();
  return session?.user.role === "ADMIN" ? session : null;
}

export async function addSingleEmployee(data: EmployeeInput) {
  try {
    const session = await requireAdmin();
    if (!session) return { success: false, error: "Unauthorized" };

    const validated = employeeSchema.parse(data);

    if (await prisma.employee.findUnique({ where: { id: validated.id } })) {
      return { success: false, error: "Employee ID already exists" };
    }
    if (await prisma.employee.findUnique({ where: { email: validated.email } })) {
      return { success: false, error: "An employee with this email already exists" };
    }

    await prisma.employee.create({ data: { ...validated, createdBy: session.user.id } });
    refresh();
    return { success: true };
  } catch (error: any) {
    console.error("Failed to add employee:", error);
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message };
    return { success: false, error: error.message || "Failed to add employee" };
  }
}

// Employee ID is the primary key and is never changed on edit.
export async function updateEmployee(data: EmployeeInput) {
  try {
    const session = await requireAdmin();
    if (!session) return { success: false, error: "Unauthorized" };

    const { id, ...fields } = employeeSchema.parse(data);

    if (!(await prisma.employee.findUnique({ where: { id } }))) {
      return { success: false, error: "Employee not found" };
    }
    const emailOwner = await prisma.employee.findUnique({ where: { email: fields.email } });
    if (emailOwner && emailOwner.id !== id) {
      return { success: false, error: `Email is already used by ${emailOwner.id}` };
    }

    await prisma.employee.update({
      where: { id },
      data: { ...fields, hrbpName: fields.hrbpName || null, updatedBy: session.user.id },
    });
    refresh();
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update employee:", error);
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message };
    return { success: false, error: error.message || "Failed to update employee" };
  }
}

// Hard delete: the linked Assessment (and its drafts) is removed via onDelete: Cascade.
export async function deleteEmployee(id: string) {
  try {
    const session = await requireAdmin();
    if (!session) return { success: false, error: "Unauthorized" };

    await prisma.employee.delete({ where: { id } });
    refresh();
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete employee:", error);
    return { success: false, error: error.code === "P2025" ? "Employee not found" : "Failed to delete employee" };
  }
}

export async function bulkUploadEmployees(employees: EmployeeInput[]) {
  try {
    const session = await requireAdmin();
    if (!session) return { success: false, error: "Unauthorized" };

    if (!Array.isArray(employees) || employees.length === 0) {
      return { success: false, error: "No data provided" };
    }

    // Validate every row, reporting the sheet row number (+2: header row + 1-based).
    const rows: EmployeeInput[] = [];
    const rowErrors: string[] = [];
    employees.forEach((emp, i) => {
      const r = employeeSchema.safeParse(emp);
      if (r.success) rows.push(r.data);
      else rowErrors.push(`Row ${i + 2}: ${r.error.issues[0].message}`);
    });

    // Duplicates inside the file would make the upsert order-dependent.
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    rows.forEach((r, i) => {
      if (seenIds.has(r.id)) rowErrors.push(`Row ${i + 2}: duplicate Emp ID ${r.id} in file`);
      if (seenEmails.has(r.email)) rowErrors.push(`Row ${i + 2}: duplicate email ${r.email} in file`);
      seenIds.add(r.id);
      seenEmails.add(r.email);
    });

    // An email already owned by a different Emp ID would hit the unique constraint mid-transaction.
    const existing = await prisma.employee.findMany({
      where: { OR: [{ id: { in: rows.map((r) => r.id) } }, { email: { in: rows.map((r) => r.email) } }] },
      select: { id: true, email: true },
    });
    const existingIds = new Set(existing.map((e) => e.id));
    const emailOwner = new Map(existing.map((e) => [e.email, e.id]));
    rows.forEach((r, i) => {
      const owner = emailOwner.get(r.email);
      if (owner && owner !== r.id) rowErrors.push(`Row ${i + 2}: email ${r.email} already belongs to ${owner}`);
    });

    if (rowErrors.length) {
      const shown = rowErrors.slice(0, 5).join(" | ");
      const more = rowErrors.length > 5 ? ` (+${rowErrors.length - 5} more)` : "";
      return { success: false, error: `Nothing was uploaded. ${shown}${more}` };
    }

    // All-or-nothing: one bad row never leaves a half-imported roster.
    await prisma.$transaction(
      async (tx) => {
        for (const emp of rows) {
          const data = { ...emp, hrbpName: emp.hrbpName || null };
          if (existingIds.has(emp.id)) {
            await tx.employee.update({ where: { id: emp.id }, data: { ...data, updatedBy: session.user.id } });
          } else {
            await tx.employee.create({ data: { ...data, createdBy: session.user.id } });
          }
        }
      },
      { timeout: 60000, maxWait: 10000 } // ponytail: sequential writes, fine for a few thousand rows; use createMany beyond that
    );

    refresh();
    const updated = rows.filter((r) => existingIds.has(r.id)).length;
    return { success: true, message: `Successfully added ${rows.length - updated} and updated ${updated} employees.` };
  } catch (error: any) {
    console.error("Bulk upload failed:", error);
    return { success: false, error: error.message || "Bulk upload failed" };
  }
}
