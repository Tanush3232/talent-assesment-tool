import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { pdf } from "@react-pdf/renderer";
import { AssessmentReportPDF } from "@/components/reports/AssessmentReportPDF";

export async function exportToExcel(data: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Talent Assessment Report");

  // Define columns based on constants and requirements
  worksheet.columns = [
    { header: "Emp ID", key: "id", width: 15 },
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Designation", key: "designation", width: 30 },
    { header: "Department", key: "department", width: 25 },
    { header: "Location", key: "location", width: 25 },
    { header: "Manager", key: "manager", width: 25 },
    { header: "Overall Score", key: "score", width: 15 },
    { header: "HiPo Status", key: "hipo", width: 20 },
    { header: "Promotability", key: "promotability", width: 20 },
    { header: "Placement Status", key: "placement", width: 20 },
    { header: "Manager Comments", key: "comments", width: 50 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" }, // Indigo 600
  };

  // Add data
  data.forEach((assessment) => {
    worksheet.addRow({
      id: assessment.employee.id,
      name: assessment.employee.name,
      email: assessment.employee.email,
      designation: assessment.employee.designation,
      department: assessment.employee.department,
      location: assessment.employee.location,
      manager: assessment.submittedBy?.name || assessment.employee.managerEmail,
      score: assessment.overallScore,
      hipo: assessment.hipoStatus,
      promotability: assessment.promotability,
      placement: assessment.wellPlaced,
      comments: assessment.managerComments,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  
  // Basic save function since we don't have file-saver installed yet, we can use standard DOM API
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Talent_Assessment_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function exportToPDF(data: any[], mode: "single" | "clubbed") {
  // We use dynamic import for PDF generation to ensure it runs strictly on client
  const blob = await pdf(<AssessmentReportPDF data={data} mode={mode} />).toBlob();
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Talent_Assessment_Report_${mode}_${new Date().toISOString().split('T')[0]}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}
