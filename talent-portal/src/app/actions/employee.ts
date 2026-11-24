"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ALLOWED_DOMAINS_LABEL, isAllowedEmailDomain } from "@/lib/constants";

const employeeSchema = z.object({
  id: z.string().trim().min(1, "Employee ID is required"),
  name: z.string().trim().min(1, "Employee Name is required"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format")
    .refine(isAllowedEmailDomain, `Allowed domains: ${ALLOWED_DOMAINS_LABEL}`),
  designation: z.string().trim().min(1, "Designation is required"),
  impactLevel: z.string().trim().min(1, "Impact Level is required"),
  entity: z.string().trim().min(1, "Entity is required"),
  department: z.string().trim().min(1, "Department is required"),
  location: z.string().trim().min(1, "Location is required"),
  managerId: z.string().trim().min(1, "Manager ID is required"),
  managerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid manager email")
    .refine(isAllowedEmailDomain, `Allowed domains: ${ALLOWED_DOMAINS_LABEL}`),
  hrbpName: z.string().trim().optional(),
});

const MERGE_FIELDS = [
  "name",
  "email",
  "designation",
  "impactLevel",
  "entity",
  "department",
  "location",
  "managerId",
  "managerEmail",
  "hrbpName",
] as const;

const isPlaceholder = (v?: string | null) =>
  !v || ["-", "--", "—", "n/a"].includes(v.trim().toLowerCase());

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
    });
    const existingById = new Map(existing.map((e) => [e.id, e]));
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

    // Smart merge: preserve existing values when incoming cell is a placeholder ("-" / blank),
    // update only changed fields (e.g. replacing "-" with a real location), and append new Emp IDs.
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    await prisma.$transaction(
      async (tx) => {
        for (const emp of rows) {
          const prev = existingById.get(emp.id);
          if (prev) {
            const patch: Record<string, string | null> = {};
            for (const field of MERGE_FIELDS) {
              const nextVal = field === "hrbpName" ? (emp.hrbpName || null) : emp[field];
              const prevVal = prev[field] ?? null;
              // Never overwrite real existing data with a "-" placeholder or blank
              if (isPlaceholder(nextVal) && !isPlaceholder(prevVal)) continue;
              if (nextVal !== prevVal) patch[field] = nextVal;
            }
            if (Object.keys(patch).length > 0) {
              await tx.employee.update({
                where: { id: emp.id },
                data: { ...patch, updatedBy: session.user.id },
              });
              updated++;
            } else {
              unchanged++;
            }
          } else {
            await tx.employee.create({
              data: { ...emp, hrbpName: emp.hrbpName || null, createdBy: session.user.id },
            });
            added++;
          }
        }
      },
      { timeout: 60000, maxWait: 10000 } // ponytail: sequential writes, fine for a few thousand rows; use createMany beyond that
    );

    refresh();
    return {
      success: true,
      message: `Added ${added}, updated ${updated}, unchanged ${unchanged} employees. Existing data & assessments preserved.`,
    };
  } catch (error: any) {
    console.error("Bulk upload failed:", error);
    return { success: false, error: error.message || "Bulk upload failed" };
  }
}
