import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const employeeCreateSchema = z.object({
  id: z
    .string()
    .min(1, "Employee ID is required")
    .regex(/^[A-Z0-9]+$/, "Employee ID must be alphanumeric uppercase (e.g. EMP001)"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Must be a valid email address"),
  designation: z.string().min(2, "Designation is required").max(200),
  impactLevel: z.string().min(1, "Impact level is required"),
  entity: z.string().min(1, "Entity is required"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  managerId: z.string().min(1, "Manager ID is required"),
  managerEmail: z.string().email("Manager email must be valid"),
});

export const employeeUpdateSchema = employeeCreateSchema.partial().extend({
  id: z.string().min(1),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// USER SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const userCreateSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  email: z.string().email("Must be a valid email"),
  role: z.enum(["ADMIN", "HR", "MANAGER"]),
  designation: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
});

export const userUpdateSchema = userCreateSchema.partial().extend({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const scoreRecord = z.record(
  z.string(),
  z.number().int().min(1).max(4)
);

export const assessmentScoresSchema = z.object({
  ability: scoreRecord,
  aspiration: scoreRecord,
  leadership: scoreRecord,
});

export const assessmentDraftSchema = z.object({
  employeeId: z.string().min(1),
  scores: assessmentScoresSchema.partial(),
  evidence: z.record(z.string(), z.string()),
  managerComments: z.string().optional(),
});

const ABILITY_INDICATORS = ["1.1", "1.2", "1.3", "1.4"];
const ASPIRATION_INDICATORS = ["2.1", "2.2", "2.3", "2.4"];
const LEADERSHIP_INDICATORS = ["3.1", "3.2", "3.3", "3.4"];
const ALL_INDICATORS = [...ABILITY_INDICATORS, ...ASPIRATION_INDICATORS, ...LEADERSHIP_INDICATORS];

export const assessmentSubmitSchema = z
  .object({
    employeeId: z.string().min(1),
    scores: z.object({
      ability: z
        .record(z.string(), z.number().int().min(1).max(4))
        .refine(
          (s) => ABILITY_INDICATORS.every((k) => k in s),
          { message: "All 4 Ability indicators must be rated" }
        ),
      aspiration: z
        .record(z.string(), z.number().int().min(1).max(4))
        .refine(
          (s) => ASPIRATION_INDICATORS.every((k) => k in s),
          { message: "All 4 Aspiration indicators must be rated" }
        ),
      leadership: z
        .record(z.string(), z.number().int().min(1).max(4))
        .refine(
          (s) => LEADERSHIP_INDICATORS.every((k) => k in s),
          { message: "All 4 Leadership indicators must be rated" }
        ),
    }),
    evidence: z
      .record(z.string(), z.string())
      .refine(
        (ev) => ALL_INDICATORS.every((k) => (ev[k]?.trim().length ?? 0) >= 100),
        {
          message: "Each indicator requires at least 100 characters of evidence",
        }
      ),
    managerComments: z
      .string()
      .min(100, "Manager comments must be at least 100 characters")
      .max(1000, "Manager comments must not exceed 1000 characters"),
  });

export type AssessmentDraftInput = z.infer<typeof assessmentDraftSchema>;
export type AssessmentSubmitInput = z.infer<typeof assessmentSubmitSchema>;
