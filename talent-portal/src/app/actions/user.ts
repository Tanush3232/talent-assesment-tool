"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  role: z.enum(["ADMIN", "HR", "MANAGER"], { message: "Role is required" }),
  designation: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
});

const updateUserSchema = userSchema.extend({ id: z.string().min(1), isActive: z.boolean() });

async function requireAdmin() {
  const session = await auth();
  return session?.user.role === "ADMIN" ? session : null;
}

export async function addSystemUser(data: z.infer<typeof userSchema>) {
  try {
    const session = await requireAdmin();
    if (!session) return { success: false, error: "Unauthorized" };

    const validated = userSchema.parse(data);

    const existing = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existing) return { success: false, error: "User with this email already exists" };

    await prisma.user.create({
      data: {
        ...validated,
        avatarInitial: validated.name.charAt(0).toUpperCase(),
        createdBy: session.user.id,
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to add user:", error);
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message };
    return { success: false, error: error.message || "Failed to add user" };
  }
}

export async function updateSystemUser(data: z.infer<typeof updateUserSchema>) {
  try {
    const session = await requireAdmin();
    if (!session) return { success: false, error: "Unauthorized" };

    const { id, ...fields } = updateUserSchema.parse(data);

    // Lock-out guard: an admin can't demote or suspend their own account.
    if (id === session.user.id && (fields.role !== "ADMIN" || !fields.isActive)) {
      return { success: false, error: "You can't change your own role or suspend your own account" };
    }

    const emailOwner = await prisma.user.findUnique({ where: { email: fields.email } });
    if (emailOwner && emailOwner.id !== id) {
      return { success: false, error: "Another user already uses this email" };
    }

    await prisma.user.update({
      where: { id },
      data: { ...fields, avatarInitial: fields.name.charAt(0).toUpperCase(), updatedBy: session.user.id },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update user:", error);
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0].message };
    return { success: false, error: error.message || "Failed to update user" };
  }
}

export async function deleteSystemUser(id: string) {
  try {
    const session = await requireAdmin();
    if (!session) return { success: false, error: "Unauthorized" };
    if (id === session.user.id) return { success: false, error: "You can't delete your own account" };

    // Users who submitted assessments are referenced by them; deleting would orphan the audit trail.
    const submitted = await prisma.assessment.count({ where: { submittedById: id } });
    if (submitted > 0) {
      return {
        success: false,
        error: `This user submitted ${submitted} assessment(s) and can't be deleted. Suspend them instead (Edit → Status).`,
      };
    }

    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    const fk = error.code === "P2003" || /foreign key/i.test(error.message || "");
    return {
      success: false,
      error: fk ? "This user is referenced by other records. Suspend them instead (Edit → Status)." : "Failed to delete user",
    };
  }
}
