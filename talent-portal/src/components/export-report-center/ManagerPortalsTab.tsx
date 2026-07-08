"use client";
// ─────────────────────────────────────────────────────────────────────────────
// MANAGER PORTALS TAB
// Matches the reference image: manager dropdown, direct reports table with
// pre-selected checkboxes, combined PDF + ZIP download buttons
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, Users, Download, Archive, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import type { ExportEmployee, ExportManager } from "@/types/export-report";
import { generatePDFBlob } from "@/lib/pdf/pdfEngine";
import { generateZipBlob, triggerDownload } from "@/lib/zip/zipEngine";
import {
  employeePdfName,
  managerZipName,
  deduplicateFilenames,
  resolveZipEntity,
} from "@/lib/pdf/fileNaming";
import { EmployeeAppraisalTemplate } from "@/lib/pdf/templates/EmployeeAppraisalTemplate";
import { ManagerCombinedTemplate } from "@/lib/pdf/templates/ManagerCombinedTemplate";

// ── Classification pill styles ────────────────────────────────────────────────
function classPill(category: string) {
  if (category.includes("High Potential"))
    return { pill: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" };
  if (category.includes("Promotable"))
    return { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  return { pill: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
}

const PDF_FOOTPRINT = "~4 Pages (A4)";

// ── Employee row ──────────────────────────────────────────────────────────────
function ManagerReportRow({
  employee,
  included,
  onToggle,
}: {
  employee: ExportEmployee;
  included: boolean;
  onToggle: () => void;
}) {
  const { computedResult } = employee.assessment;
  const { pill, dot } = classPill(computedResult.classificationCategory);

  return (
    <tr
      onClick={onToggle}
      className={`border-b border-slate-100 cursor-pointer transition-colors select-none
        ${included ? "bg-blue-50/40" : "hover:bg-slate-50/60 opacity-60"}`}
    >
      {/* Inclusion checkbox */}
      <td className="w-12 px-5 py-3.5 text-center">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all
            ${included
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 bg-white hover:border-blue-400"}`}
        >
          {included && (
            <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </td>

      {/* Report Name */}
      <td className="px-4 py-3.5">
        <div className="font-semibold text-slate-900 text-[13px]">{employee.name}</div>
        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{employee.id}</div>
      </td>

      {/* Title / Role */}
      <td className="px-4 py-3.5 text-[12.5px] text-slate-500">{employee.designation}</td>

      {/* Overall Appraisal */}
      <td className="px-4 py-3.5">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          {computedResult.classificationCategory.split("(")[0].trim()}
          <span className="text-[10px] opacity-70">({computedResult.grandTotal})</span>
        </div>
        {computedResult.isHiPoException && (
          <span className="ml-1.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
            ⚡ Exception
          </span>
        )}
      </td>

      {/* PDF Footprint */}
      <td className="px-4 py-3.5 text-[12px] text-slate-400">{PDF_FOOTPRINT}</td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ManagerPortalsTab({
  managers,
}: {
  managers: ExportManager[];
}) {
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [employees, setEmployees] = useState<ExportEmployee[]>([]);
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [generatingCombined, setGeneratingCombined] = useState(false);
  const [generatingZip, setGeneratingZip] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedManager = managers.find((m) => m.id === selectedManagerId) ?? null;
  const includedList = employees.filter((e) => includedIds.has(e.id));
  const noneIncluded = includedList.length === 0;

  const fetchManagerEmployees = useCallback(async (managerId: string) => {
    setLoadingEmployees(true);
    setEmployees([]);
    setIncludedIds(new Set());
    try {
      const res = await fetch(`/api/export/manager-employees?managerId=${managerId}`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      const data = await res.json();
      const emps: ExportEmployee[] = data.employees ?? [];
      setEmployees(emps);
      // Pre-select all employees
      setIncludedIds(new Set(emps.map((e) => e.id)));
    } catch {
      toast.error("Could not load employees for this manager.");
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    if (selectedManagerId) {
      fetchManagerEmployees(selectedManagerId);
    } else {
      setEmployees([]);
      setIncludedIds(new Set());
    }
  }, [selectedManagerId, fetchManagerEmployees]);

  function toggleIncluded(id: string) {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Download Combined PDF ─────────────────────────────────────────────────
  async function handleCombinedPDF() {
    if (!selectedManager || includedList.length === 0) return;
    setGeneratingCombined(true);
    try {
      toast.loading("Assembling combined PDF…", { id: "mgr-combined" });
      const blob = await generatePDFBlob(
        <ManagerCombinedTemplate
          manager={selectedManager}
          employees={includedList}
        />
      );
      const entity = resolveZipEntity(includedList.map((e) => e.entity));
      const filename = `${entity ? entity.replace(/[^a-zA-Z0-9]/g, "_") : "Adventz_Group"}_Manager_${selectedManager.name.replace(/[^a-zA-Z0-9]/g, "_")}_Combined_${new Date().toISOString().split("T")[0]}.pdf`;
      triggerDownload(blob, filename);
      toast.success("Combined PDF downloaded", { id: "mgr-combined" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate combined PDF.", { id: "mgr-combined" });
    } finally {
      setGeneratingCombined(false);
    }
  }

  // ── Download ZIP ──────────────────────────────────────────────────────────
  async function handleZipDownload() {
    if (!selectedManager || includedList.length === 0) return;
    setGeneratingZip(true);
    try {
      toast.loading(`Generating ${includedList.length} PDFs for ZIP…`, { id: "mgr-zip" });
      const rawNames = includedList.map(employeePdfName);
      const dedupedNames = deduplicateFilenames(rawNames);
      const files: { name: string; blob: Blob }[] = [];

      for (let i = 0; i < includedList.length; i++) {
        const emp = includedList[i];
        const blob = await generatePDFBlob(<EmployeeAppraisalTemplate employee={emp} />);
        files.push({ name: dedupedNames[i], blob });
      }

      toast.loading("Packaging ZIP…", { id: "mgr-zip" });
      const entity = resolveZipEntity(includedList.map((e) => e.entity));
      const zipBlob = await generateZipBlob(files);
      triggerDownload(zipBlob, managerZipName(selectedManager.name, entity));
      toast.success(`ZIP downloaded — ${includedList.length} reports`, { id: "mgr-zip" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate ZIP.", { id: "mgr-zip" });
    } finally {
      setGeneratingZip(false);
    }
  }

  const isGenerating = generatingCombined || generatingZip;

  return (
    <div className="flex flex-col h-full">
      {/* ── Manager Dropdown ──────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[9.5px] font-bold tracking-widest text-slate-400 uppercase mb-2.5">
            Select Line Manager
          </p>

          {/* Custom dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              disabled={isGenerating}
              className="w-full flex items-center justify-between px-4 h-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            >
              <span className={selectedManager ? "text-slate-900 font-medium" : "text-slate-400"}>
                {selectedManager
                  ? `${selectedManager.name}${selectedManager.designation ? ` (${selectedManager.designation})` : ""}`
                  : "Select a manager…"}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {managers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">No managers found.</div>
                ) : (
                  managers.map((mgr) => (
                    <button
                      key={mgr.id}
                      onClick={() => {
                        setSelectedManagerId(mgr.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                        ${mgr.id === selectedManagerId
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "hover:bg-slate-50 text-slate-700"}`}
                    >
                      <span>{mgr.name}</span>
                      {mgr.designation && (
                        <span className="text-[11px] text-slate-400">{mgr.designation}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Employee Table ────────────────────────────────────────────────── */}
      {selectedManager && (
        <>
          <div className="px-6 mb-3">
            <p className="text-[9.5px] font-bold tracking-widest text-slate-400 uppercase">
              Managed Direct Reports Preview
            </p>
          </div>

          <div className="flex-1 overflow-y-auto mx-6 rounded-xl border border-slate-200 bg-white min-h-0">
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading direct reports…</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                <Users className="w-8 h-8 text-slate-300" />
                <p className="text-sm">No completed assessments for {selectedManager.name}'s direct reports.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="w-12 px-5 py-2.5 text-center text-[9.5px] font-bold tracking-widest text-slate-400 uppercase">
                      INCLUSION
                    </th>
                    {["REPORT NAME", "TITLE / ROLE", "OVERALL APPRAISAL", "PDF FOOTPRINT"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[9.5px] font-bold tracking-widest text-slate-400 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <ManagerReportRow
                      key={emp.id}
                      employee={emp}
                      included={includedIds.has(emp.id)}
                      onToggle={() => toggleIncluded(emp.id)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── Spacer when no manager selected ──────────────────────────────── */}
      {!selectedManager && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3">
          <Users className="w-12 h-12" />
          <p className="text-sm text-slate-400">Select a manager to preview their direct reports</p>
        </div>
      )}

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl">
        <p className="text-[12px] text-slate-500">
          {!selectedManager
            ? "Select a manager to view and package their appraisal profiles."
            : noneIncluded
            ? "Select at least one report to package their appraisal profiles."
            : `${includedList.length} report${includedList.length > 1 ? "s" : ""} included — ready to download`}
        </p>

        <div className="flex items-center gap-2.5">
          {/* Combined PDF button */}
          <button
            onClick={handleCombinedPDF}
            disabled={noneIncluded || isGenerating || !selectedManager}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all
              ${noneIncluded || isGenerating || !selectedManager
                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-white hover:border-blue-700 shadow-sm"}`}
          >
            {generatingCombined ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Combined PDF
          </button>

          {/* ZIP button */}
          <button
            onClick={handleZipDownload}
            disabled={noneIncluded || isGenerating || !selectedManager}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${noneIncluded || isGenerating || !selectedManager
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm hover:shadow-md"}`}
          >
            {generatingZip ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
            Download ZIP
          </button>
        </div>
      </div>
    </div>
  );
}
