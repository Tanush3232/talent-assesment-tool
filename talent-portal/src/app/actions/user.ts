"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["ADMIN", "HR", "MANAGER"], { message: "Role is required" }),
  designation: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
});

export async function addSystemUser(data: z.infer<typeof userSchema>) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const validated = userSchema.parse(data);

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: validated.email }
    });

    if (existing) {
      return { success: false, error: "User with this email already exists" };
    }

    await prisma.user.create({
      data: {
        ...validated,
        avatarInitial: validated.name.charAt(0).toUpperCase(),
        createdBy: session.user.id,
      }
    });

    revalidatePath("/admin");
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to add user:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: error.message || "Failed to add user" };
  }
}
