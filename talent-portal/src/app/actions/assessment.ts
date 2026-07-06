"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assessmentDraftSchema, assessmentSubmitSchema } from "@/lib/validators";
import { AssessmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function saveAssessmentDraft(employeeId: string, data: any) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  
  // Validate data against Zod schema (Partial because it's a draft)
  const parsed = assessmentDraftSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid data format");
  }
  
  const validatedData = parsed.data;

  await prisma.assessment.upsert({
    where: { employeeId },
    create: {
      employeeId,
      cycle: "FY2026",
      status: AssessmentStatus.DRAFT,
      scores: validatedData.scores || {},
      evidence: validatedData.evidence || {},
      managerComments: validatedData.managerComments || "",
      createdBy: session.user.id,
      updatedBy: session.user.id,
    },
    update: {
      scores: validatedData.scores || {},
      evidence: validatedData.evidence || {},
      managerComments: validatedData.managerComments || "",
      updatedBy: session.user.id,
    }
  });

  return { success: true };
}

export async function submitAssessment(employeeId: string, data: any) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  
  // Full validation for final submission
  const parsed = assessmentSubmitSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Validation failed");
  }
  
  const validatedData = parsed.data;

  await prisma.assessment.upsert({
    where: { employeeId },
    create: {
      employeeId,
      cycle: "FY2026",
      status: AssessmentStatus.COMPLETED,
      scores: validatedData.scores,
      evidence: validatedData.evidence,
      managerComments: validatedData.managerComments,
      submittedById: session.user.id,
      submittedAt: new Date(),
      createdBy: session.user.id,
      updatedBy: session.user.id,
    },
    update: {
      status: AssessmentStatus.COMPLETED,
      scores: validatedData.scores,
      evidence: validatedData.evidence,
      managerComments: validatedData.managerComments,
      submittedById: session.user.id,
      submittedAt: new Date(),
      updatedBy: session.user.id,
    }
  });

  revalidatePath("/dashboard");
  revalidatePath(`/assessment/${employeeId}`);

  return { success: true };
}
