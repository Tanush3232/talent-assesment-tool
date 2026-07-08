// ─────────────────────────────────────────────────────────────────────────────
// FILE NAMING UTILITIES
// Conventions:
//   Individual PDF:  EMP001_Arjun_Mehta_Engineering_R_D_AdventzCorporateCoE.pdf
//   Individual ZIP:  AdventzCorporateCoE_Employee_Appraisal_Reports_2026-07-08.zip
//   Manager ZIP:     AdventzCorporateCoE_Manager_Sandeep_Sharma_Portal_2026-07-08.zip
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize a string for use in a filename:
 * - Replaces spaces and any non-alphanumeric/hyphen/underscore chars with _
 * - Collapses consecutive underscores
 * - Trims leading/trailing underscores
 */
export function sanitizeName(str: string): string {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Generates the PDF filename for an individual employee report.
 * Pattern: {EmpId}_{Name}_{Department}_{Entity}.pdf
 */
export function employeePdfName(employee: {
  id: string;
  name: string;
  department: string;
  entity: string;
}): string {
  const id = sanitizeName(employee.id);
  const name = sanitizeName(employee.name);
  const dept = sanitizeName(employee.department);
  const entity = sanitizeName(employee.entity);
  return `${id}_${name}_${dept}_${entity}.pdf`;
}

/**
 * Generates the ZIP filename for a batch employee export.
 * Uses the entity name dynamically. Falls back to "Adventz_Group" for mixed-entity exports.
 */
export function zipName(entity?: string): string {
  const date = new Date().toISOString().split("T")[0];
  const prefix = entity ? sanitizeName(entity) : "Adventz_Group";
  return `${prefix}_Employee_Appraisal_Reports_${date}.zip`;
}

/**
 * Generates the ZIP filename for a manager portal export.
 */
export function managerZipName(managerName: string, entity?: string): string {
  const date = new Date().toISOString().split("T")[0];
  const mgr = sanitizeName(managerName);
  const prefix = entity ? sanitizeName(entity) : "Adventz_Group";
  return `${prefix}_Manager_${mgr}_Portal_${date}.zip`;
}

/**
 * Deduplicates filenames in an array by appending _2, _3, etc. to collisions.
 */
export function deduplicateFilenames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const existing = seen.get(name) ?? 0;
    seen.set(name, existing + 1);
    if (existing === 0) return name;
    const dotIdx = name.lastIndexOf(".");
    const base = dotIdx >= 0 ? name.slice(0, dotIdx) : name;
    const ext = dotIdx >= 0 ? name.slice(dotIdx) : "";
    return `${base}_${existing + 1}${ext}`;
  });
}

/**
 * Determine entity label for ZIP naming when employees may span multiple entities.
 * Returns the single entity if all match, or undefined (falls back to "Adventz_Group").
 */
export function resolveZipEntity(entities: string[]): string | undefined {
  const unique = [...new Set(entities)];
  return unique.length === 1 ? unique[0] : undefined;
}
