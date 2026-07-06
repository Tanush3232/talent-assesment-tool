"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";

export default function ExportDropdown({ data }: { data: any[] }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'excel' | 'pdf-single' | 'pdf-clubbed') => {
    try {
      setIsExporting(true);
      
      const completedAssessments = data.filter(d => d.status === "COMPLETED");
      
      if (completedAssessments.length === 0) {
        toast.error("No completed assessments to export.");
        return;
      }

      if (type === 'excel') {
        await exportToExcel(completedAssessments);
        toast.success("Excel report exported successfully");
      } else if (type === 'pdf-clubbed') {
        // Group by manager
        await exportToPDF(completedAssessments, "clubbed");
        toast.success("Clubbed PDF report exported successfully");
      } else {
        // Single PDFs (download as zip or one big PDF with page breaks, we'll do one PDF with all, but separated conceptually)
        await exportToPDF(completedAssessments, "single");
        toast.success("Individual PDF reports exported successfully");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="bg-slate-900 hover:bg-slate-800 text-white" disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export Report
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
          <FileSpreadsheet className="w-4 h-4 mr-2 text-zuari-green" />
          <span>Excel Workbook (.xlsx)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('pdf-clubbed')} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2 text-zuari-red" />
          <div className="flex flex-col">
            <span>PDF (Clubbed)</span>
            <span className="text-[10px] text-slate-500">Grouped by Manager</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf-single')} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2 text-zuari-red" />
          <div className="flex flex-col">
            <span>PDF (Individual)</span>
            <span className="text-[10px] text-slate-500">One page per employee</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
