"use client";

import { useState } from "react";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { computeFullAssessmentResult } from "@/lib/scoring";

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
        { header: "HRBP", key: "hrbp", width: 20 },
        // Subdimensions
        { header: "Ability 1.1", key: "a11", width: 12 },
        { header: "Ability 1.2", key: "a12", width: 12 },
        { header: "Ability 1.3", key: "a13", width: 12 },
        { header: "Ability 1.4", key: "a14", width: 12 },
        { header: "Aspiration 2.1", key: "a21", width: 14 },
        { header: "Aspiration 2.2", key: "a22", width: 14 },
        { header: "Aspiration 2.3", key: "a23", width: 14 },
        { header: "Aspiration 2.4", key: "a24", width: 14 },
        { header: "Leadership 3.1", key: "l31", width: 14 },
        { header: "Leadership 3.2", key: "l32", width: 14 },
        { header: "Leadership 3.3", key: "l33", width: 14 },
        { header: "Leadership 3.4", key: "l34", width: 14 },
        // Subtotals
        { header: "Ability Subtotal", key: "abilityTotal", width: 16 },
        { header: "Aspiration Subtotal", key: "aspirationTotal", width: 18 },
        { header: "Leadership Subtotal", key: "leadershipTotal", width: 18 },
        { header: "Grand Total Score", key: "grandTotal", width: 16 },
        { header: "Final Talent Classification", key: "classification", width: 28 },
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

        const row = ws.addRow({
          empId: assessment.employee.id,
          name: assessment.employee.name,
          role: assessment.employee.designation,
          dept: assessment.employee.department,
          location: assessment.employee.location,
          manager: assessment.submittedByUser?.name || assessment.employee.managerEmail,
          status: assessment.status,
          hrbp: assessment.employee.hrbpName || "",
          a11: ab["1.1"] || "",
          a12: ab["1.2"] || "",
          a13: ab["1.3"] || "",
          a14: ab["1.4"] || "",
          a21: asp["2.1"] || "",
          a22: asp["2.2"] || "",
          a23: asp["2.3"] || "",
          a24: asp["2.4"] || "",
          l31: lead["3.1"] || "",
          l32: lead["3.2"] || "",
          l33: lead["3.3"] || "",
          l34: lead["3.4"] || "",
          abilityTotal: result.abilitySum,
          aspirationTotal: result.aspirationSum,
          leadershipTotal: result.leadershipSum,
          grandTotal: result.grandTotal,
          classification: result.classification.category,
        });

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
