"use client";

import { useState, useMemo, useRef } from "react";
import { ChevronDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { computeFullAssessmentResult } from "@/lib/scoring";
import { SUB_DIMENSIONS, formatAssessmentCycle, getClassificationTheme } from "@/lib/constants";

const ALL_SUB_DIMS = [
  ...SUB_DIMENSIONS.ability,
  ...SUB_DIMENSIONS.aspiration,
  ...SUB_DIMENSIONS.leadership,
];
import ExcelJS from "exceljs";
import { toast } from "sonner";
import ExportReportCenter from "@/components/export-report-center/ExportReportCenter";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type AssessmentStatus = "PENDING" | "DRAFT" | "COMPLETED";

type Employee = {
  id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  function?: string | null;
  entity: string;
  location: string;
  managerId: string;
  managerEmail: string;
  hrbpName: string | null;
  impactLevel: string;
  assessment: {
    id: string;
    status: AssessmentStatus;
    scores: any;
    classification: string | null;
    isHiPoException: boolean;
    managerComments: string | null;
    submittedByUser: { name: string } | null;
  } | null;
  managerName?: string;
};

type CategoryFilter =
  | "ALL"
  | "HIPO"
  | "PROMOTABLE"
  | "WELLPLACED"
  | "HIPO_EXCLUSION";

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "ALL", label: "All Categories" },
  { value: "HIPO", label: "High Potential (HiPo)" },
  { value: "PROMOTABLE", label: "Promotable / Expandable" },
  { value: "WELLPLACED", label: "Well-placed" },
  { value: "HIPO_EXCLUSION", label: "HiPo Exclusions (Rule Applied)" },
];

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS (outside component)
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-rose-100 text-rose-700",
    "bg-teal-100 text-teal-700",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

function getFn(emp: Employee): string {
  return emp.function?.trim() || "—";
}

function computeEmpResult(emp: Employee) {
  if (!emp.assessment || emp.assessment.status !== "COMPLETED") return null;
  try {
    return computeFullAssessmentResult(emp.assessment.scores || {});
  } catch {
    return null;
  }
}

function getDisplayCategory(emp: Employee): string | null {
  const result = computeEmpResult(emp);
  if (!result) return null;
  const isEx =
    result.classification.isHiPoException ?? emp.assessment?.isHiPoException ?? false;
  if (isEx) return "Promotable/Expandable";
  return result.classification.category as string;
}

function checkIsException(emp: Employee): boolean {
  const result = computeEmpResult(emp);
  if (!result) return false;
  return !!(result.classification.isHiPoException ?? emp.assessment?.isHiPoException);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASCADE HELPER — compute downstream filter state synchronously
// ─────────────────────────────────────────────────────────────────────────────

function cascade(
  employees: Employee[],
  manager: string,
  location: string,
  fn: string,
  dept: string,
  entity: string
) {
  // Step 1 — manager
  const afterM =
    manager === "ALL"
      ? employees
      : employees.filter(
          (e) => (e.managerName || e.managerEmail) === manager
        );
  const locsSet = Array.from(new Set(afterM.map((e) => e.location)));
  const newLoc =
    location !== "ALL" && locsSet.includes(location)
      ? location
      : locsSet.length === 1
      ? locsSet[0]
      : "ALL";

  // Step 2 — location
  const afterL =
    newLoc === "ALL" ? afterM : afterM.filter((e) => e.location === newLoc);
  const fnsSet = Array.from(new Set(afterL.map((e) => getFn(e))));
  const newFn =
    fn !== "ALL" && fnsSet.includes(fn)
      ? fn
      : fnsSet.length === 1
      ? fnsSet[0]
      : "ALL";

  // Step 3 — function
  const afterF =
    newFn === "ALL"
      ? afterL
      : afterL.filter((e) => getFn(e) === newFn);
  const deptsSet = Array.from(new Set(afterF.map((e) => e.department)));
  const newDept =
    dept !== "ALL" && deptsSet.includes(dept)
      ? dept
      : deptsSet.length === 1
      ? deptsSet[0]
      : "ALL";

  // Step 4 — department
  const afterD =
    newDept === "ALL"
      ? afterF
      : afterF.filter((e) => e.department === newDept);
  const entSet = Array.from(new Set(afterD.map((e) => e.entity)));
  const newEntity =
    entity !== "ALL" && entSet.includes(entity)
      ? entity
      : entSet.length === 1
      ? entSet[0]
      : "ALL";

  return {
    newLoc,
    newFn,
    newDept,
    newEntity,
    validLocs: ["ALL", ...locsSet],
    validFns: ["ALL", ...fnsSet],
    validDepts: ["ALL", ...deptsSet],
    validEntities: ["ALL", ...entSet],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER SELECT
// ─────────────────────────────────────────────────────────────────────────────

function FilterSelect({
  label,
  options,
  value,
  onChange,
  locked,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">
        {label}:
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          className={`appearance-none pr-7 pl-3 h-8 text-xs font-semibold border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors ${
            locked
              ? "border-blue-300 bg-blue-50 text-blue-700 cursor-default opacity-90"
              : "border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer"
          }`}
        >
          <option value="ALL">
            All{" "}
            {label === "DEPT"
              ? "Depts"
              : label === "FUNCTION"
              ? "Functions"
              : label.charAt(0) + label.slice(1).toLowerCase() + "s"}
          </option>
          {options
            .filter((o) => o !== "ALL")
            .map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CORPORATE GROUPING PILL
// ─────────────────────────────────────────────────────────────────────────────

function GroupingPill({ category }: { category: string | null }) {
  if (!category || category === "Pending Rating" || category === "Pending") {
    return <span className="text-xs text-slate-400 italic">—</span>;
  }
  const { ui } = getClassificationTheme(category);
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${ui.pill}`}
    >
      {category}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENHANCED EXPORT BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function EnhancedExport({ data }: { data: any[] }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (data.length === 0) {
      toast.error("No completed assessments to export.");
      return;
    }
    setLoading(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("HR Audit Report");

      ws.columns = [
        { header: "Employee ID", key: "empId", width: 14 },
        { header: "Employee Name", key: "name", width: 26 },
        { header: "Role / Designation", key: "role", width: 30 },
        { header: "Department", key: "dept", width: 25 },
        { header: "Entity", key: "entity", width: 28 },
        { header: "Location", key: "location", width: 30 },
        { header: "Impact Level", key: "impactLevel", width: 14 },
        { header: "Manager Name", key: "manager", width: 25 },
        { header: "HRBP", key: "hrbp", width: 20 },
        { header: "Evaluation Status", key: "status", width: 18 },
        { header: "Assessment Cycle", key: "cycle", width: 18 },
        ...ALL_SUB_DIMS.flatMap((d) => [
          {
            header: `${d.id} ${d.title} (Score)`,
            key: `score_${d.id}`,
            width: 16,
          },
          {
            header: `${d.id} ${d.title} - Manager Remark`,
            key: `obs_${d.id}`,
            width: 38,
          },
        ]),
        { header: "Ability Subtotal", key: "abilityTotal", width: 16 },
        { header: "Aspiration Subtotal", key: "aspirationTotal", width: 18 },
        { header: "Leadership Subtotal", key: "leadershipTotal", width: 18 },
        { header: "Potential Score (/ 48)", key: "grandTotal", width: 20 },
        {
          header: "Final Talent Classification",
          key: "classification",
          width: 28,
        },
        { header: "HiPo Exception", key: "hipoException", width: 16 },
        { header: "Manager Comments", key: "managerComments", width: 50 },
      ];

      // Header row styling
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      };
      headerRow.height = 24;
      headerRow.alignment = { vertical: "middle", wrapText: false };

      data.forEach((assessment, idx) => {
        const scores = (assessment.scores || {}) as any;
        const result = computeFullAssessmentResult(scores);
        const ab = scores.ability || {};
        const asp = scores.aspiration || {};
        const lead = scores.leadership || {};
        const allScores: Record<string, number | string> = { ...ab, ...asp, ...lead };
        const evidence = (assessment.evidence || {}) as Record<string, string>;
        const competencyCells = Object.fromEntries(
          ALL_SUB_DIMS.flatMap((d) => [
            [`score_${d.id}`, allScores[d.id] || ""],
            [`obs_${d.id}`, evidence[d.id] || ""],
          ])
        );

        const isEx =
          result.classification.isHiPoException ??
          assessment.isHiPoException ??
          false;
        const displayCat = isEx
          ? "Promotable/Expandable"
          : result.classification.category;

        const row = ws.addRow({
          empId: assessment.employee.id,
          name: assessment.employee.name,
          role: assessment.employee.designation,
          dept: assessment.employee.department,
          entity: assessment.employee.entity,
          location: assessment.employee.location,
          impactLevel: assessment.employee.impactLevel || "",
          manager:
            assessment.managerName ||
            assessment.submittedByUser?.name ||
            assessment.employee.managerEmail,
          hrbp: assessment.employee.hrbpName || "",
          status: assessment.status,
          cycle: formatAssessmentCycle(assessment.cycle),
          ...competencyCells,
          abilityTotal: result.abilitySum,
          aspirationTotal: result.aspirationSum,
          leadershipTotal: result.leadershipSum,
          grandTotal: result.grandTotal,
          classification: displayCat,
          hipoException: isEx ? "TRUE" : "FALSE",
          managerComments: assessment.managerComments || "",
        });
        row.alignment = { vertical: "top", wrapText: true };

        if (idx % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFF" },
          };
        }

        const classCell = row.getCell("classification");
        if (displayCat && displayCat !== "Pending Rating") {
          const { excel } = getClassificationTheme(displayCat);
          classCell.font = { bold: true, color: { argb: excel.fontArgb } };
          classCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: excel.fillArgb },
          };
        }

        const exCell = row.getCell("hipoException");
        if (isEx) {
          exCell.font = { bold: true, color: { argb: "FFD97706" } };
        }
      });

      ws.views = [{ state: "frozen", ySplit: 1 }];

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Zuari_HR_Audit_Report_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`HR Audit Report exported — ${data.length} records`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-emerald-500/30 bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-sm disabled:opacity-60 whitespace-nowrap"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="w-4 h-4" />
      )}
      Export Calibration Log
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsAnalyticsClient({
  employees,
  completedAssessments,
  role,
}: {
  employees: Employee[];
  completedAssessments: any[];
  role?: string;
}) {
  // ── Filter state ────────────────────────────────────────────────────────
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [functionFilter, setFunctionFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");

  // ── Category filter (Section 2) ─────────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [catOpen, setCatOpen] = useState(false);

  // ── All managers ────────────────────────────────────────────────────────
  const allManagers = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(employees.map((e) => e.managerName || e.managerEmail))
      ),
    ],
    [employees]
  );

  // ── Cascading pipeline (memoised for rendering) ─────────────────────────
  const afterManager = useMemo(
    () =>
      managerFilter === "ALL"
        ? employees
        : employees.filter(
            (e) => (e.managerName || e.managerEmail) === managerFilter
          ),
    [employees, managerFilter]
  );

  const validLocations = useMemo(
    () => ["ALL", ...Array.from(new Set(afterManager.map((e) => e.location)))],
    [afterManager]
  );

  const afterLocation = useMemo(
    () =>
      locationFilter === "ALL"
        ? afterManager
        : afterManager.filter((e) => e.location === locationFilter),
    [afterManager, locationFilter]
  );

  const validFunctions = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(afterLocation.map((e) => getFn(e)))),
    ],
    [afterLocation]
  );

  const afterFunction = useMemo(
    () =>
      functionFilter === "ALL"
        ? afterLocation
        : afterLocation.filter((e) => getFn(e) === functionFilter),
    [afterLocation, functionFilter]
  );

  const validDepts = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(afterFunction.map((e) => e.department))),
    ],
    [afterFunction]
  );

  const afterDept = useMemo(
    () =>
      deptFilter === "ALL"
        ? afterFunction
        : afterFunction.filter((e) => e.department === deptFilter),
    [afterFunction, deptFilter]
  );

  const validEntities = useMemo(
    () => ["ALL", ...Array.from(new Set(afterDept.map((e) => e.entity)))],
    [afterDept]
  );

  const baseFiltered = useMemo(
    () =>
      entityFilter === "ALL"
        ? afterDept
        : afterDept.filter((e) => e.entity === entityFilter),
    [afterDept, entityFilter]
  );

  // ── Cascading change handlers ───────────────────────────────────────────

  const handleManagerChange = (v: string) => {
    const { newLoc, newFn, newDept, newEntity } = cascade(
      employees, v, "ALL", "ALL", "ALL", "ALL"
    );
    setManagerFilter(v);
    setLocationFilter(newLoc);
    setFunctionFilter(newFn);
    setDeptFilter(newDept);
    setEntityFilter(newEntity);
  };

  const handleLocationChange = (v: string) => {
    const { newFn, newDept, newEntity } = cascade(
      employees, managerFilter, v, "ALL", "ALL", "ALL"
    );
    setLocationFilter(v);
    setFunctionFilter(newFn);
    setDeptFilter(newDept);
    setEntityFilter(newEntity);
  };

  const handleFunctionChange = (v: string) => {
    const { newDept, newEntity } = cascade(
      employees, managerFilter, locationFilter, v, "ALL", "ALL"
    );
    setFunctionFilter(v);
    setDeptFilter(newDept);
    setEntityFilter(newEntity);
  };

  const handleDeptChange = (v: string) => {
    const { newEntity } = cascade(
      employees, managerFilter, locationFilter, functionFilter, v, "ALL"
    );
    setDeptFilter(v);
    setEntityFilter(newEntity);
  };

  const clearFilters = () => {
    setManagerFilter("ALL");
    setLocationFilter("ALL");
    setFunctionFilter("ALL");
    setDeptFilter("ALL");
    setEntityFilter("ALL");
  };

  const hasFilters =
    managerFilter !== "ALL" ||
    locationFilter !== "ALL" ||
    functionFilter !== "ALL" ||
    deptFilter !== "ALL" ||
    entityFilter !== "ALL";

  // ── Locked filter flags ─────────────────────────────────────────────────
  const locationLocked =
    validLocations.filter((l) => l !== "ALL").length === 1 &&
    locationFilter !== "ALL";
  const functionLocked =
    validFunctions.filter((f) => f !== "ALL").length === 1 &&
    functionFilter !== "ALL";
  const deptLocked =
    validDepts.filter((d) => d !== "ALL").length === 1 && deptFilter !== "ALL";
  const entityLocked =
    validEntities.filter((e) => e !== "ALL").length === 1 &&
    entityFilter !== "ALL";

  // ── Distribution for chart ──────────────────────────────────────────────
  const distribution = useMemo(() => {
    const completed = baseFiltered.filter(
      (e) => e.assessment?.status === "COMPLETED"
    );
    let hipo = 0,
      promotable = 0,
      wellPlaced = 0;
    completed.forEach((emp) => {
      const cat = getDisplayCategory(emp);
      if (cat === "High Potential (HiPo)") hipo++;
      else if (cat === "Promotable/Expandable") promotable++;
      else if (cat === "Well-placed") wellPlaced++;
    });
    return { hipo, promotable, wellPlaced, total: completed.length };
  }, [baseFiltered]);

  const totalRated = distribution.total;
  const pct = (n: number) =>
    totalRated > 0 ? (n / totalRated) * 100 : 0;

  const hipoPct = pct(distribution.hipo);
  const proPct = pct(distribution.promotable);
  const wpPct = pct(distribution.wellPlaced);

  // ── Registry rows ───────────────────────────────────────────────────────
  const registryRows = useMemo(() => {
    if (categoryFilter === "ALL") return baseFiltered;
    return baseFiltered.filter((emp) => {
      if (emp.assessment?.status !== "COMPLETED") return false;
      const isEx = checkIsException(emp);
      const cat = getDisplayCategory(emp);
      if (categoryFilter === "HIPO") return cat === "High Potential (HiPo)";
      if (categoryFilter === "PROMOTABLE")
        return cat === "Promotable/Expandable" && !isEx;
      if (categoryFilter === "WELLPLACED") return cat === "Well-placed";
      if (categoryFilter === "HIPO_EXCLUSION") return isEx;
      return true;
    });
  }, [baseFiltered, categoryFilter]);

  const selectedCatLabel =
    CATEGORY_OPTIONS.find((o) => o.value === categoryFilter)?.label ??
    "All Categories";

  // ── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── SECTION 1 HEADER ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Reports, Analytics &amp; Calibration Dashboard
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Access team potential statistics, calibration distribution charts,
            and audit logs.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <EnhancedExport data={completedAssessments} />
          <ExportReportCenter role={role ?? ""} />
        </div>
      </div>

      {/* ── CHART CARD ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters + Title header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-8">
            {/* Card title */}
            <div className="flex-shrink-0 min-w-[180px]">
              <h2 className="font-bold text-slate-900 text-[15px] leading-snug">
                Talent Potential Distribution
              </h2>
            </div>

            {/* Filter rows */}
            <div className="flex flex-col gap-2 flex-1">
              {/* Row 1: Manager, Location, Function */}
              <div className="flex items-center gap-4 flex-wrap">
                <FilterSelect
                  label="MANAGER"
                  options={allManagers}
                  value={managerFilter}
                  onChange={handleManagerChange}
                />
                <FilterSelect
                  label="LOCATION"
                  options={validLocations}
                  value={locationFilter}
                  onChange={handleLocationChange}
                  locked={locationLocked}
                />
                <FilterSelect
                  label="FUNCTION"
                  options={validFunctions}
                  value={functionFilter}
                  onChange={handleFunctionChange}
                  locked={functionLocked}
                />
              </div>
              {/* Row 2: Dept, Entity, Clear */}
              <div className="flex items-center gap-4 flex-wrap">
                <FilterSelect
                  label="DEPT"
                  options={validDepts}
                  value={deptFilter}
                  onChange={handleDeptChange}
                  locked={deptLocked}
                />
                <FilterSelect
                  label="ENTITY"
                  options={validEntities}
                  value={entityFilter}
                  onChange={setEntityFilter}
                  locked={entityLocked}
                />
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 underline transition-colors ml-1"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bar chart rows */}
        <div className="px-6 py-1">
          {[
            {
              label: "High Potential (HiPo)",
              count: distribution.hipo,
              percentage: hipoPct,
              barClass: getClassificationTheme("High Potential").ui.bar,
            },
            {
              label: "Promotable / Expandable",
              count: distribution.promotable,
              percentage: proPct,
              barClass: getClassificationTheme("Promotable").ui.bar,
            },
            {
              label: "Well-placed",
              count: distribution.wellPlaced,
              percentage: wpPct,
              barClass: getClassificationTheme("Well-placed").ui.bar,
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-6 py-5 border-b border-slate-100 last:border-0"
            >
              {/* Label col */}
              <div className="w-52 flex-shrink-0">
                <div className="font-bold text-slate-900 text-sm">
                  {row.label}
                </div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mt-0.5">
                  Potential Axis
                </div>
              </div>

              {/* Bar col */}
              <div className="flex-1 relative h-10">
                <div className="absolute inset-0 bg-slate-100 rounded-lg overflow-hidden">
                  {row.percentage > 0 ? (
                    <div
                      className={`h-full ${row.barClass} rounded-lg flex items-center px-3 transition-all duration-700 ease-out`}
                      style={{ width: `${Math.max(row.percentage, 0)}%` }}
                    >
                      <span className="text-white text-xs font-bold whitespace-nowrap">
                        {row.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <div className="h-full flex items-center px-3">
                      <span className="text-slate-400 text-xs font-semibold">
                        0.0%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats col */}
              <div className="w-28 text-right flex-shrink-0 leading-snug">
                <div>
                  <span className="text-slate-900 font-extrabold text-base">
                    {row.count}
                  </span>
                  <span className="text-slate-400 text-sm font-medium">
                    {" "}
                    employees
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {row.count} OF {totalRated} RATED
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart footer */}
        <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-6">
          <p className="text-[11px] text-slate-400 max-w-md leading-relaxed">
            This horizontal bar chart lists potential categories along the
            Y-axis. The bar widths represent the relative density of employee
            allocations.
          </p>
          <div className="flex items-center gap-3 flex-shrink-0">
            {(() => {
              const hipoUi = getClassificationTheme("High Potential").ui;
              const proUi = getClassificationTheme("Promotable").ui;
              return (
                <>
                  <span className={`flex items-center gap-1.5 text-[11px] font-bold border px-3 py-1.5 rounded-full ${hipoUi.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hipoUi.dot} inline-block`} />
                    HiPo Ratio: {hipoPct.toFixed(1)}%
                  </span>
                  <span className={`flex items-center gap-1.5 text-[11px] font-bold border px-3 py-1.5 rounded-full ${proUi.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${proUi.dot} inline-block`} />
                    Promotable: {proPct.toFixed(1)}%
                  </span>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: TALENT POTENTIAL REGISTRY ────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Talent Potential Registry Database
            </h2>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-500 whitespace-nowrap">
              CATEGORY FILTER:
            </span>
            <div className="relative">
              <button
                onClick={() => setCatOpen((p) => !p)}
                className="flex items-center justify-between gap-2 pl-3 pr-8 h-9 text-xs font-semibold border border-slate-300 rounded-lg bg-white hover:border-slate-400 transition-colors text-slate-700 min-w-[210px]"
              >
                <span>{selectedCatLabel}</span>
                <ChevronDown
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 transition-transform ${
                    catOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {catOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setCatOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setCategoryFilter(opt.value);
                          setCatOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          categoryFilter === opt.value
                            ? "bg-slate-800 text-white"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {opt.value === "HIPO" ? (
                          <>
                            High Potential{" "}
                            <span
                              className={
                                categoryFilter === opt.value
                                  ? "text-violet-300"
                                  : "text-violet-600"
                              }
                            >
                              (HiPo)
                            </span>
                          </>
                        ) : (
                          opt.label
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  ID
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Employee
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Department &amp; Region
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Assigned Line Manager
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Evaluation Status
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Potential Score
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Corporate Grouping
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registryRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-16 text-slate-400 text-sm"
                  >
                    No employees match the current filters.
                  </td>
                </tr>
              ) : (
                registryRows.map((emp) => {
                  const result = computeEmpResult(emp);
                  const status = emp.assessment?.status || "PENDING";
                  const displayCat = getDisplayCategory(emp);
                  const score = result ? result.grandTotal : null;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      {/* ID */}
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold text-slate-500 font-mono tracking-wide">
                          {emp.id}
                        </span>
                      </td>

                      {/* Employee */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${avatarColor(
                              emp.name
                            )}`}
                          >
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm leading-tight">
                              {emp.name}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {emp.designation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Region */}
                      <td className="px-4 py-4">
                        <div className="text-xs font-semibold text-blue-600">
                          {emp.department}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {emp.location}
                          {emp.entity ? ` • ${emp.entity}` : ""}
                        </div>
                      </td>

                      {/* Manager */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700">
                          {emp.managerName || emp.managerEmail}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border ${
                            status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : status === "DRAFT"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Potential Score */}
                      <td className="px-4 py-4">
                        {score !== null ? (
                          <span className="text-sm font-bold text-slate-800">
                            {score}{" "}
                            <span className="text-slate-400 font-medium">
                              / 48
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Corporate Grouping — NEVER show HiPo Exception */}
                      <td className="px-4 py-4">
                        <GroupingPill category={displayCat} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
