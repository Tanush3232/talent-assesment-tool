// ─────────────────────────────────────────────────────────────────────────────
// EXPORT REPORT CENTER — Shared Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportEmployee {
  id: string;
  name: string;
  designation: string;
  department: string;
  entity: string;
  location: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  hrbpName: string | null;
  impactLevel: string;
  assessment: ExportAssessment;
}

export interface ExportAssessment {
  id: string;
  status: "COMPLETED";
  scores: {
    ability: Record<string, number>;
    aspiration: Record<string, number>;
    leadership: Record<string, number>;
  };
  evidence: Record<string, string>;
  managerComments: string | null;
  classification: string | null;
  isHiPoException: boolean;
  cycle: string;
  submittedAt: string | null;
  computedResult: ComputedAssessmentResult;
}

export interface ComputedAssessmentResult {
  abilitySum: number;
  aspirationSum: number;
  leadershipSum: number;
  grandTotal: number;
  classificationCategory: string;
  classificationDescription: string;
  isHiPoException: boolean;
}

export interface ExportManager {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  department: string | null;
}

export interface ExportApiResponse {
  employees: ExportEmployee[];
  managers: ExportManager[];
}

export interface ManagerEmployeesApiResponse {
  employees: ExportEmployee[];
}
