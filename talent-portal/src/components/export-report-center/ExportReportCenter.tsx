"use client";
// ─────────────────────────────────────────────────────────────────────────────
// EXPORT REPORT CENTER — Trigger Button
// HR / ADMIN only. Renders beside the Export Calibration Log button.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { LayoutList } from "lucide-react";
import ExportReportCenterModal from "./ExportReportCenterModal";

interface ExportReportCenterProps {
  /** Pass the user role from the server component; renders nothing for non-HR/ADMIN */
  role: string;
}

export default function ExportReportCenter({ role }: ExportReportCenterProps) {
  const [open, setOpen] = useState(false);

  // Guard: only HR and ADMIN may see this button
  if (role !== "HR" && role !== "ADMIN") return null;

  return (
    <>
      <button
        id="export-report-center-btn"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-700/30 bg-slate-900/5 text-slate-800 text-sm font-bold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
      >
        <LayoutList className="w-4 h-4" />
        Export Report Center
      </button>

      <ExportReportCenterModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
