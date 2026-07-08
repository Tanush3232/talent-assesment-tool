"use client";
// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL APPRAISALS TAB
// Matches the reference image: info banner + search, selectable table,
// adaptive bottom bar (no selection → disabled, 1 → PDF, 2+ → ZIP)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import { Search, Info, Download, Archive, Loader2, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import type { ExportEmployee } from "@/types/export-report";
import { generatePDFBlob } from "@/lib/pdf/pdfEngine";
import { generateZipBlob, triggerDownload } from "@/lib/zip/zipEngine";
import {
  employeePdfName,
  zipName,
  deduplicateFilenames,
  resolveZipEntity,
} from "@/lib/pdf/fileNaming";
import { EmployeeAppraisalTemplate } from "@/lib/pdf/templates/EmployeeAppraisalTemplate";

// ── Classification chip styling ───────────────────────────────────────────────
function classChip(category: string) {
  if (category.includes("High Potential"))
    return "bg-blue-50 text-blue-700 border-blue-200";
  if (category.includes("Promotable"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function scoreDisplay(grandTotal: number): string {
  return `${grandTotal} / 48`;
}

// ── Row component ─────────────────────────────────────────────────────────────
function EmployeeRow({
  employee,
  selected,
  onToggle,
}: {
  employee: ExportEmployee;
  selected: boolean;
  onToggle: () => void;
}) {
  const { computedResult } = employee.assessment;
  const chip = classChip(computedResult.classificationCategory);

  return (
    <tr
      onClick={onToggle}
      className={`border-b border-slate-100 cursor-pointer transition-colors select-none
        ${selected ? "bg-blue-50/60" : "hover:bg-slate-50/70"}`}
    >
      {/* Checkbox */}
      <td className="w-10 px-4 py-3 text-center">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors
            ${selected
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 bg-white hover:border-blue-400"}`}
          aria-label={selected ? "Deselect" : "Select"}
        >
          {selected && (
            <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </td>

      {/* Employee Name */}
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-900 text-[13px] leading-snug">{employee.name}</div>
        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{employee.id}</div>
      </td>

      {/* Department */}
      <td className="px-4 py-3 text-[13px] text-slate-600">{employee.department}</td>

      {/* Direct Manager */}
      <td className="px-4 py-3 text-[13px] text-slate-600">{employee.managerName}</td>

      {/* Score Rating */}
      <td className="px-4 py-3">
        <div className="font-bold text-slate-900 text-[13px]">{scoreDisplay(computedResult.grandTotal)}</div>
        <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${chip}`}>
          {computedResult.classificationCategory.split("(")[0].trim()}
          {computedResult.isHiPoException ? " ⚡" : ""}
        </div>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IndividualAppraisalsTab({
  employees,
}: {
  employees: ExportEmployee[];
}) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Real-time filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.managerName.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const selectedList = employees.filter((e) => selectedIds.has(e.id));
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));

  function toggleEmployee(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((e) => next.add(e.id));
        return next;
      });
    }
  }

  async function handleDownload() {
    if (selectedList.length === 0) return;
    setGenerating(true);
    setProgress(null);

    try {
      if (selectedList.length === 1) {
        // Single PDF
        const emp = selectedList[0];
        toast.loading("Generating PDF report…", { id: "pdf-gen" });
        const blob = await generatePDFBlob(
          <EmployeeAppraisalTemplate employee={emp} />
        );
        triggerDownload(blob, employeePdfName(emp));
        toast.success(`Downloaded: ${emp.name}'s report`, { id: "pdf-gen" });
      } else {
        // ZIP of multiple PDFs
        toast.loading(`Generating ${selectedList.length} PDFs…`, { id: "pdf-gen" });
        const rawNames = selectedList.map(employeePdfName);
        const dedupedNames = deduplicateFilenames(rawNames);
        const files: { name: string; blob: Blob }[] = [];

        for (let i = 0; i < selectedList.length; i++) {
          const emp = selectedList[i];
          setProgress({ done: i, total: selectedList.length });
          const blob = await generatePDFBlob(
            <EmployeeAppraisalTemplate employee={emp} />
          );
          files.push({ name: dedupedNames[i], blob });
          setProgress({ done: i + 1, total: selectedList.length });
        }

        toast.loading("Packaging ZIP…", { id: "pdf-gen" });
        const entity = resolveZipEntity(selectedList.map((e) => e.entity));
        const zipBlob = await generateZipBlob(files);
        triggerDownload(zipBlob, zipName(entity));
        toast.success(`Downloaded ZIP — ${selectedList.length} reports`, { id: "pdf-gen" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate report. Please try again.", { id: "pdf-gen" });
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }

  const noneSelected  = selectedList.length === 0;
  const multiSelected = selectedList.length > 1;

  return (
    <div className="flex flex-col h-full">
      {/* ── Info banner + Search row ─────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-6 pt-5 pb-4">
        {/* Banner */}
        <div className="flex items-start gap-2.5 flex-1 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-blue-700 leading-relaxed">
            In case you select multiple employees, they will be downloaded as{" "}
            <span className="font-semibold">individual PDFs inside a zipped folder.</span>
          </p>
        </div>

        {/* Search */}
        <div className="relative w-56 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff name / role…"
            className="w-full pl-9 pr-3 h-9 text-[12.5px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white placeholder:text-slate-400 transition-all"
          />
        </div>
      </div>

      {/* ── Sub-header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pb-3">
        <p className="text-[12px] text-slate-500">
          {noneSelected
            ? "Select one or more employees below to begin"
            : `${selectedList.length} employee${selectedList.length > 1 ? "s" : ""} selected`}
        </p>
        <button
          onClick={toggleAll}
          className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {allFilteredSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      {/* ── Employee Table ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto mx-6 rounded-xl border border-slate-200 bg-white min-h-0">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-10 px-4 py-2.5 text-center">
                <button
                  onClick={toggleAll}
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {allFilteredSelected
                    ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    : <Square className="w-3.5 h-3.5" />}
                </button>
              </th>
              {["EMPLOYEE NAME", "DEPARTMENT", "DIRECT MANAGER", "SCORE RATING"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[9.5px] font-bold tracking-widest text-slate-400 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                  {search ? `No employees match "${search}"` : "No completed assessments found."}
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <EmployeeRow
                  key={emp.id}
                  employee={emp}
                  selected={selectedIds.has(emp.id)}
                  onToggle={() => toggleEmployee(emp.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Bottom action bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl">
        {/* Status text */}
        <div className="text-[12px] text-slate-500">
          {noneSelected ? (
            "No employee selected. Choose profiles from the table above to proceed."
          ) : generating && progress ? (
            <span className="flex items-center gap-2 text-blue-600 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating {progress.done}/{progress.total} PDFs…
            </span>
          ) : (
            <span className="font-medium text-slate-700">
              {selectedList.length} {selectedList.length === 1 ? "report" : "reports"} ready —{" "}
              {multiSelected ? "will be packaged as ZIP" : "will download as PDF"}
            </span>
          )}
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={noneSelected || generating}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all
            ${noneSelected || generating
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-blue-700 hover:bg-blue-800 text-white shadow-sm hover:shadow-md"}`}
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : multiSelected ? (
            <Archive className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {generating
            ? "Generating…"
            : noneSelected
            ? "Download Reports"
            : multiSelected
            ? `Download ZIP (${selectedList.length})`
            : "Download Report"}
        </button>
      </div>
    </div>
  );
}
