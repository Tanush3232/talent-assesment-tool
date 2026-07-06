"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const employeeSchema = z.object({
  id: z.string().min(1, "Employee ID is required"),
  name: z.string().min(1, "Employee Name is required"),
  email: z.string().email("Invalid email format"),
  designation: z.string().min(1, "Designation is required"),
  impactLevel: z.string().min(1, "Impact Level is required"),
  entity: z.string().min(1, "Entity is required"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  managerId: z.string().min(1, "Manager ID is required"),
  managerEmail: z.string().email("Invalid manager email"),
  hrbpName: z.string().optional(),
});

export async function addSingleEmployee(data: z.infer<typeof employeeSchema>) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const validated = employeeSchema.parse(data);

    // Check if employee exists
    const existing = await prisma.employee.findUnique({
      where: { id: validated.id }
    });

    if (existing) {
      return { success: false, error: "Employee ID already exists" };
    }

    await prisma.employee.create({
      data: {
        ...validated,
        createdBy: session.user.id,
      }
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to add employee:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: error.message || "Failed to add employee" };
  }
}

export async function bulkUploadEmployees(employees: z.infer<typeof employeeSchema>[]) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!Array.isArray(employees) || employees.length === 0) {
      return { success: false, error: "No data provided" };
    }

    // Validate all rows
    const validatedEmployees = employees.map(emp => employeeSchema.parse(emp));

    let added = 0;
    let updated = 0;

    // Use a transaction for bulk upsert
    await prisma.$transaction(async (tx) => {
      for (const emp of validatedEmployees) {
        const existing = await tx.employee.findUnique({
          where: { id: emp.id }
        });

        if (existing) {
          await tx.employee.update({
            where: { id: emp.id },
            data: {
              ...emp,
              updatedBy: session.user.id,
            }
          });
          updated++;
        } else {
          await tx.employee.create({
            data: {
              ...emp,
              createdBy: session.user.id,
            }
          });
          added++;
        }
      }
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return { success: true, message: `Successfully added ${added} and updated ${updated} employees.` };
  } catch (error: any) {
    console.error("Bulk upload failed:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed on one or more rows. Please check data format." };
    }
    return { success: false, error: error.message || "Bulk upload failed" };
  }
}
