"use client";
// ─────────────────────────────────────────────────────────────────────────────
// EXPORT REPORT CENTER MODAL
// Large, premium modal with two tabs matching the reference images.
// Handles data fetching and passes data down to tab components.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { X, User, Users, FileOutput, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ExportEmployee, ExportManager } from "@/types/export-report";
import IndividualAppraisalsTab from "./IndividualAppraisalsTab";
import ManagerPortalsTab from "./ManagerPortalsTab";

type Tab = "individual" | "manager";

interface ExportReportCenterModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ExportReportCenterModal({
  open,
  onClose,
}: ExportReportCenterModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("individual");
  const [employees, setEmployees] = useState<ExportEmployee[]>([]);
  const [managers, setManagers] = useState<ExportManager[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all data when modal opens ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/export/employees");
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setEmployees(data.employees ?? []);
      setManagers(data.managers ?? []);
    } catch (err) {
      console.error(err);
      setError("Could not load assessment data. Please try again.");
      toast.error("Failed to load export data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
      setActiveTab("individual");
    } else {
      // Reset on close
      setEmployees([]);
      setManagers([]);
      setError(null);
    }
  }, [open, fetchData]);

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ── Prevent body scroll while open ───────────────────────────────────────
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Modal panel ───────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export Report Center"
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[90vw] max-w-5xl h-[88vh] max-h-[720px]
                   bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden
                   ring-1 ring-slate-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-7 pt-6 pb-5 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <FileOutput className="w-4.5 h-4.5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                Performance Appraisal Exporter
              </h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Choose individual reports or generate aggregated folders.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors mt-0.5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Tab Navigation ────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-100 bg-white flex-shrink-0 px-2">
          {([
            { id: "individual" as Tab, label: "Individual Appraisals", icon: User },
            { id: "manager"    as Tab, label: "Manager Portals",       icon: Users },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-6 py-3.5 text-[13px] font-semibold border-b-2 transition-all
                ${activeTab === id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ───────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
              <p className="text-sm text-slate-500">Loading assessment data…</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <X className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">{error}</p>
                <button
                  onClick={fetchData}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "individual" && (
                <IndividualAppraisalsTab employees={employees} />
              )}
              {activeTab === "manager" && (
                <ManagerPortalsTab managers={managers} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
