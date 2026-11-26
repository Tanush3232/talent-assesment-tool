"use client";

import { useState } from "react";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { computeFullAssessmentResult } from "@/lib/scoring";
import { SUB_DIMENSIONS, formatAssessmentCycle } from "@/lib/constants";

const ALL_SUB_DIMS = [
  ...SUB_DIMENSIONS.ability,
  ...SUB_DIMENSIONS.aspiration,
  ...SUB_DIMENSIONS.leadership,
];

export default function ExportCalibrationLog({ data }: { data: any[] }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (data.length === 0) {
      toast.error("No completed assessments to export.");
      return;
    }
    setLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Calibration Log");

      // Columns
      ws.columns = [
        { header: "Employee ID", key: "empId", width: 15 },
        { header: "Employee Name", key: "name", width: 25 },
        { header: "Role", key: "role", width: 30 },
        { header: "Department", key: "dept", width: 25 },
        { header: "Location", key: "location", width: 30 },
        { header: "Manager Name", key: "manager", width: 25 },
        { header: "Evaluation Status", key: "status", width: 18 },
        { header: "Assessment Cycle", key: "cycle", width: 18 },
        { header: "HRBP", key: "hrbp", width: 20 },
        // Subdimensions interleaved with Manager Remarks
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
        // Subtotals
        { header: "Ability Subtotal", key: "abilityTotal", width: 16 },
        { header: "Aspiration Subtotal", key: "aspirationTotal", width: 18 },
        { header: "Leadership Subtotal", key: "leadershipTotal", width: 18 },
        { header: "Grand Total Score", key: "grandTotal", width: 16 },
        { header: "Final Talent Classification", key: "classification", width: 28 },
        { header: "Manager Justification & Comments", key: "managerComments", width: 45 },
      ];

      // Style header row
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }; // Zuari Blue
      ws.getRow(1).height = 24;
      ws.getRow(1).alignment = { vertical: "middle" };

      // Add data rows
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

        const row = ws.addRow({
          empId: assessment.employee.id,
          name: assessment.employee.name,
          role: assessment.employee.designation,
          dept: assessment.employee.department,
          location: assessment.employee.location,
          manager: assessment.submittedByUser?.name || assessment.employee.managerEmail,
          status: assessment.status,
          cycle: formatAssessmentCycle(assessment.cycle),
          hrbp: assessment.employee.hrbpName || "",
          ...competencyCells,
          abilityTotal: result.abilitySum,
          aspirationTotal: result.aspirationSum,
          leadershipTotal: result.leadershipSum,
          grandTotal: result.grandTotal,
          classification: result.classification.category,
          managerComments: assessment.managerComments || "",
        });
        row.alignment = { vertical: "top", wrapText: true };

        // Alternate row shading
        if (idx % 2 === 0) {
          row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFF" } };
        }

        // Color the classification cell
        const classCell = row.getCell("classification");
        if (result.classification.category === "High Potential (HiPo)") {
          classCell.font = { bold: true, color: { argb: "FF1E3A8A" } };
        } else if (result.classification.category === "Promotable/Expandable") {
          classCell.font = { bold: true, color: { argb: "FF166534" } };
        }
      });

      // Freeze first row
      ws.views = [{ state: "frozen", ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Zuari_Calibration_Log_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Calibration log exported — ${data.length} records`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export calibration log.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-zuari-blue/30 bg-zuari-blue/5 text-zuari-blue text-sm font-bold hover:bg-zuari-blue hover:text-white hover:border-zuari-blue transition-all shadow-sm disabled:opacity-60"
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
