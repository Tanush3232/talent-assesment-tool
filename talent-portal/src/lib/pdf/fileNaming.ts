// ─────────────────────────────────────────────────────────────────────────────
// FILE & ZIP NAMING UTILITIES
// Produces concise filenames (especially ZIP archives and bundled PDFs) to
// avoid Windows MAX_PATH extraction errors.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExportEmployee } from "@/types/export-report";

/** Replace characters unsafe in filenames with underscores, collapsing multiples. */
export function sanitizeName(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Report";
}

/** Concise individual PDF filename so extracted ZIP paths stay short on Windows. */
export function employeePdfName(employee: Pick<ExportEmployee, "id" | "name">): string {
  const safeId = sanitizeName(employee.id);
  const safeName = sanitizeName(employee.name).slice(0, 32);
  return `${safeId}_${safeName}.pdf`;
}

/** Resolve common entity when employees share one; returns null otherwise. */
export function resolveZipEntity(entities: Array<string | null | undefined>): string | null {
  const unique = Array.from(
    new Set(entities.map((e) => (e || "").trim()).filter(Boolean))
  );
  return unique.length === 1 ? unique[0] : null;
}

/** Short ZIP filename for individual appraisals export (`ZIL_Potential.zip`). */
export function zipName(_entity?: string | null): string {
  return "ZIL_Potential.zip";
}

/** Short ZIP filename for Manager Portal export (`ZIL_Potential_<Manager>.zip`). */
export function managerZipName(managerName: string, _entity?: string | null): string {
  const shortMgr = sanitizeName(managerName).slice(0, 24);
  return `ZIL_Potential_${shortMgr}.zip`;
}

/** Ensure no duplicate filenames exist inside a ZIP archive. */
export function deduplicateFilenames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count === 0) return name;
    const dotIdx = name.lastIndexOf(".");
    if (dotIdx === -1) return `${name}_${count + 1}`;
    return `${name.slice(0, dotIdx)}_${count + 1}${name.slice(dotIdx)}`;
  });
}
