"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileDown, AlertCircle, CheckCircle2, Trash2, Table as TableIcon } from "lucide-react";
import { bulkUploadEmployees } from "@/app/actions/employee";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ParsedEmployee = {
  id: string;
  name: string;
  email: string;
  designation: string;
  impactLevel: string;
  entity: string;
  managerId: string;
  managerEmail: string;
  location: string;
  department: string;
  hrbpName: string;
  errors: string[];
};

export default function BulkUploadDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedEmployee[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const EXPECTED_HEADERS = [
    "Emp ID", "Employee Name", "Employee Email", "Designation", "Impact Level", 
    "Employee Entity", "Manager ID", "Manager Email", "Location", "Department", "HRBP Name"
  ];

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Employees");
      
      // Add Headers
      sheet.addRow(EXPECTED_HEADERS);
      
      // Add Sample Row
      sheet.addRow([
        "EMP015", "John Doe", "john.doe@zuari.com", "Senior Developer", "High",
        "Zuari Industries Ltd", "MGR001", "sandeep.sharma@zuari.com", "Bengaluru", "Engineering", "Amit Kumar"
      ]);

      // Style Headers
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }; // Zuari Blue
      
      sheet.columns.forEach(col => { col.width = 25; });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = "Zuari_Employee_Bulk_Upload_Template.xlsx";
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download template");
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      toast.error("Please upload a valid .xlsx or .csv file");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        // Since exceljs's csv parser doesn't work well with raw strings in browser typing easily,
        // we can just convert the string to a readable stream if it's node, but in the browser we can just mock it or handle it.
        // Actually, exceljs's load doesn't work perfectly for CSV. 
        // We will just read it with basic parsing if it's CSV, but for now let's just bypass TS error with any.
        await (workbook.csv.read as any)(buffer);
      } else {
        await workbook.xlsx.load(buffer);
      }

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        toast.error("The uploaded file is empty");
        return;
      }

      const rows: ParsedEmployee[] = [];
      let isFirstRow = true;

      sheet.eachRow((row, rowNumber) => {
        if (isFirstRow) {
          isFirstRow = false;
          return; // Skip header
        }

        // ExcelJS rows are 1-indexed for values.
        const id = row.getCell(1).text?.trim() || "";
        const name = row.getCell(2).text?.trim() || "";
        const email = row.getCell(3).text?.trim() || "";
        const designation = row.getCell(4).text?.trim() || "";
        const impactLevel = row.getCell(5).text?.trim() || "";
        const entity = row.getCell(6).text?.trim() || "";
        const managerId = row.getCell(7).text?.trim() || "";
        const managerEmail = row.getCell(8).text?.trim() || "";
        const location = row.getCell(9).text?.trim() || "";
        const department = row.getCell(10).text?.trim() || "";
        const hrbpName = row.getCell(11).text?.trim() || "";

        const errors: string[] = [];
        if (!id) errors.push("Emp ID is required");
        if (!name) errors.push("Name is required");
        if (!email) errors.push("Email is required");
        else if (!/^\S+@\S+\.\S+$/.test(email)) errors.push("Invalid Email");
        if (!designation) errors.push("Designation is required");
        if (!entity) errors.push("Entity is required");
        if (!managerId) errors.push("Manager ID is required");
        if (!department) errors.push("Department is required");

        // Only add if at least one field has data
        if (id || name || email || designation) {
          rows.push({
            id, name, email, designation, impactLevel, entity, managerId, managerEmail, location, department, hrbpName, errors
          });
        }
      });

      if (rows.length === 0) {
        toast.error("No valid data rows found in the file.");
        return;
      }

      setParsedData(rows);
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse the file. Please ensure it matches the template.");
    }
  };

  const handleUpload = async () => {
    if (!parsedData) return;
    
    const hasErrors = parsedData.some(r => r.errors.length > 0);
    if (hasErrors) {
      toast.error("Please fix invalid rows before uploading");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bulkUploadEmployees(parsedData);
      if (res.success) {
        toast.success(res.message || "Bulk upload successful!");
        handleClose();
      } else {
        toast.error(res.error || "Failed to bulk upload employees");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred during uploading.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setParsedData(null), 300); // Wait for transition
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const hasErrors = parsedData?.some(r => r.errors.length > 0) || false;

  return (
    <Dialog open={open} onOpenChange={(val) => !val ? handleClose() : setOpen(true)}>
      <DialogTrigger render={<Button className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white shadow-sm transition-all"><UploadCloud className="w-4 h-4 mr-2" /> Bulk Upload</Button>} />
      
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden bg-white border-0 shadow-2xl">
        <div className="bg-[#1e3a8a] p-6 text-white flex flex-row items-center gap-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <TableIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <DialogTitle className="text-2xl font-bold tracking-tight">Bulk Upload Employees</DialogTitle>
            <p className="text-white/80 mt-1 text-sm">Upload your organization roster via Excel</p>
          </div>
        </div>

        <div className="p-6">
          {!parsedData ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">1. Download Template</h4>
                  <p className="text-sm text-slate-500 mt-1">Get the properly formatted Excel file to ensure seamless uploading.</p>
                </div>
                <Button onClick={handleDownloadTemplate} variant="outline" className="border-slate-300 text-[#1e3a8a] hover:text-[#1e3a8a] hover:bg-[#1e3a8a]/5">
                  <FileDown className="w-4 h-4 mr-2" /> Download .xlsx
                </Button>
              </div>

              <div 
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer",
                  dragActive ? "border-[#059669] bg-[#059669]/5" : "border-slate-300 hover:border-[#1e3a8a] hover:bg-slate-50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto w-16 h-16 bg-[#1e3a8a]/10 text-[#1e3a8a] rounded-full flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">2. Upload Completed File</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                  Drag and drop your filled Excel or CSV file here, or click to browse files from your computer.
                </p>
                <input 
                  type="file" 
                  accept=".xlsx, .csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) processFile(e.target.files[0]);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Data Preview</h3>
                  <p className="text-sm text-slate-500">
                    Found {parsedData.length} rows. {hasErrors ? <span className="text-[#e11d48] font-medium">Please fix invalid rows.</span> : <span className="text-[#059669] font-medium">All rows valid!</span>}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setParsedData(null)} className="text-slate-500 hover:text-slate-900">
                  <Trash2 className="w-4 h-4 mr-2" /> Discard
                </Button>
              </div>

              <ScrollArea className="h-[400px] border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                    <TableRow className="hover:bg-slate-100 border-b-slate-200">
                      <TableHead className="font-semibold text-slate-700 w-[100px]">Emp ID</TableHead>
                      <TableHead className="font-semibold text-slate-700">Name</TableHead>
                      <TableHead className="font-semibold text-slate-700">Email</TableHead>
                      <TableHead className="font-semibold text-slate-700">Role & Dept</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, idx) => {
                      const isInvalid = row.errors.length > 0;
                      return (
                        <TableRow key={idx} className={cn("border-b-slate-100", isInvalid ? "bg-zuari-red/10/50 hover:bg-zuari-red/10" : "bg-white hover:bg-slate-50")}>
                          <TableCell className="font-mono text-xs">{row.id || <span className="text-[#e11d48] font-bold">MISSING</span>}</TableCell>
                          <TableCell className="font-medium text-slate-900">{row.name || <span className="text-[#e11d48] font-bold">MISSING</span>}</TableCell>
                          <TableCell className="text-slate-600">{row.email || <span className="text-[#e11d48] font-bold">MISSING</span>}</TableCell>
                          <TableCell className="text-slate-600">
                            <div>{row.designation || <span className="text-[#e11d48] font-bold">MISSING</span>}</div>
                            <div className="text-xs text-slate-400">{row.department || <span className="text-[#e11d48] font-bold">MISSING</span>}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            {isInvalid ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center text-[#e11d48] text-xs font-bold bg-[#e11d48]/10 px-2 py-1 rounded-full border border-[#e11d48]/20">
                                  <AlertCircle className="w-3 h-3 mr-1" /> Invalid
                                </div>
                                <div className="text-[10px] text-[#e11d48] max-w-[150px] leading-tight font-medium">
                                  {row.errors.join(", ")}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end text-[#059669] text-xs font-bold bg-[#059669]/10 px-2 py-1 rounded-full w-fit ml-auto border border-[#059669]/20">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Valid
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              <DialogFooter className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting} className="text-slate-500 hover:text-slate-900">
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleUpload} 
                  disabled={isSubmitting || hasErrors} 
                  className={cn(
                    "text-white shadow-md font-bold transition-all px-8",
                    hasErrors ? "bg-slate-300 hover:bg-slate-300" : "bg-[#059669] hover:bg-[#059669]/90"
                  )}
                >
                  {isSubmitting ? "Uploading..." : "Confirm & Upload"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
