"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileDown, AlertCircle, CheckCircle2, Trash2, Table as TableIcon, Info } from "lucide-react";
import { bulkUploadEmployees } from "@/app/actions/employee";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ALLOWED_DOMAINS_LABEL, isAllowedEmailDomain } from "@/lib/constants";

type ParsedEmployee = {
  rowNumber: number;
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

// header text (as shown in the template) -> field. Columns are matched by header name, so column order doesn't matter.
const COLUMNS: { header: string; field: keyof ParsedEmployee; required: boolean; hint: string }[] = [
  { header: "Emp ID", field: "id", required: true, hint: "Unique ID, e.g. EMP015. Re-using an existing ID UPDATES that employee." },
  { header: "Employee Name", field: "name", required: true, hint: "Full name" },
  { header: "Employee Email", field: "email", required: true, hint: "Unique work email" },
  { header: "Designation", field: "designation", required: true, hint: "Job title, e.g. Senior Developer" },
  { header: "Impact Level", field: "impactLevel", required: true, hint: "Critical, High, Medium or Low" },
  { header: "Employee Entity", field: "entity", required: true, hint: "e.g. Zuari Industries Ltd" },
  { header: "Manager ID", field: "managerId", required: true, hint: "Manager's ID, e.g. MGR001" },
  { header: "Manager Email", field: "managerEmail", required: true, hint: "Must match the manager's portal login email - this controls whose dashboard the employee appears on" },
  { header: "Location", field: "location", required: true, hint: "e.g. Bengaluru Outer Ring Road CoE" },
  { header: "Department", field: "department", required: true, hint: "e.g. Engineering & R&D" },
  { header: "HRBP Name", field: "hrbpName", required: false, hint: "Optional" },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Minimal RFC-4180 CSV parser (quotes, escaped quotes, commas/newlines inside quotes). ExcelJS's csv reader needs Node streams.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export default function BulkUploadDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedEmployee[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      // Sheet 1: the data sheet that gets uploaded (first sheet is the one we read).
      const sheet = workbook.addWorksheet("Employees");
      sheet.addRow(COLUMNS.map((c) => c.header));
      sheet.addRow([
        "EMP015", "John Doe", "john.doe@adventz.com", "Senior Developer", "High",
        "Zuari Industries Ltd", "MGR001", "sandeep.sharma@adventz.com", "Bengaluru Outer Ring Road CoE", "Engineering & R&D", "Amit Kumar",
      ]);
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      sheet.getRow(2).font = { italic: true, color: { argb: "FF94A3B8" } };
      sheet.columns.forEach((col) => { col.width = 28; });
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      // Sheet 2: instructions (ignored by the importer).
      const help = workbook.addWorksheet("Instructions");
      help.getColumn(1).width = 22;
      help.getColumn(2).width = 14;
      help.getColumn(3).width = 90;
      [
        ["HOW TO UPLOAD"],
        ["1. Fill the 'Employees' sheet - one employee per row, starting on row 2. Row 2 is a sample: overwrite or delete it."],
        ["2. Do NOT rename, reorder-away or delete the header row (row 1). Save as .xlsx (or .csv)."],
        ["3. In the portal: Admin > Employee Database > Bulk Upload > drop the file > review the preview > Confirm & Upload."],
        ["4. Upload is all-or-nothing: if any row is invalid, nothing is saved and the problem rows are shown."],
        ["5. Smart Merge & Append: A new Emp ID is APPENDED. An existing Emp ID only updates changed fields (e.g. replacing '-' placeholders with real locations). Existing values and assessments are never wiped."],
        [`6. Allowed Email Domains: ${ALLOWED_DOMAINS_LABEL}`],
        [""],
        ["COLUMN", "REQUIRED", "WHAT TO ENTER"],
        ...COLUMNS.map((c) => [c.header, c.required ? "Yes" : "No", c.hint]),
      ].forEach((r) => help.addRow(r));
      help.getRow(1).font = { bold: true, size: 14 };
      help.getRow(8).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Zuari_Employee_Bulk_Upload_Template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template");
    }
  };

  const processFile = async (file: File) => {
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    if (!isCsv && !file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Please upload a valid .xlsx or .csv file");
      return;
    }

    try {
      let grid: string[][];
      if (isCsv) {
        grid = parseCsv(await file.text());
      } else {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet) { toast.error("The uploaded file is empty"); return; }
        grid = [];
        sheet.eachRow({ includeEmpty: false }, (row) => {
          const cells: string[] = [];
          for (let c = 1; c <= sheet.columnCount; c++) cells.push(row.getCell(c).text?.trim() ?? "");
          grid.push(cells);
        });
      }

      if (grid.length < 2) { toast.error("No data rows found. Fill in rows below the header."); return; }

      // Map header names -> column index.
      const headerIdx = grid[0].map(norm);
      const colOf = COLUMNS.map((c) => headerIdx.indexOf(norm(c.header)));
      const missing = COLUMNS.filter((c, i) => c.required && colOf[i] === -1).map((c) => c.header);
      if (missing.length) {
        toast.error(`Missing column(s): ${missing.join(", ")}. Please use the downloaded template.`);
        return;
      }

      const rows: ParsedEmployee[] = [];
      const seenIds = new Map<string, number>();
      const seenEmails = new Map<string, number>();

      grid.slice(1).forEach((cells, i) => {
        const rowNumber = i + 2;
        const get = (idx: number) => (idx === -1 ? "" : (cells[idx] ?? "").trim());
        if (cells.every((c) => !c?.trim())) return; // skip blank rows
        const rec: any = { rowNumber };
        COLUMNS.forEach((c, k) => { rec[c.field] = get(colOf[k]); });

        const errors: string[] = [];
        COLUMNS.forEach((c) => { if (c.required && !rec[c.field]) errors.push(`${c.header} is required`); });
        if (rec.email && !EMAIL_RE.test(rec.email)) errors.push("Invalid Employee Email");
        else if (rec.email && !isAllowedEmailDomain(rec.email)) errors.push(`Employee Email domain must be ${ALLOWED_DOMAINS_LABEL}`);
        if (rec.managerEmail && !EMAIL_RE.test(rec.managerEmail)) errors.push("Invalid Manager Email");
        else if (rec.managerEmail && !isAllowedEmailDomain(rec.managerEmail)) errors.push(`Manager Email domain must be ${ALLOWED_DOMAINS_LABEL}`);

        const idKey = rec.id.toLowerCase();
        const emailKey = rec.email.toLowerCase();
        if (idKey && seenIds.has(idKey)) errors.push(`Duplicate Emp ID (also row ${seenIds.get(idKey)})`);
        if (emailKey && seenEmails.has(emailKey)) errors.push(`Duplicate email (also row ${seenEmails.get(emailKey)})`);
        if (idKey) seenIds.set(idKey, rowNumber);
        if (emailKey) seenEmails.set(emailKey, rowNumber);

        rows.push({ ...rec, errors });
      });

      if (rows.length === 0) { toast.error("No data rows found in the file."); return; }
      setParsedData(rows);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read the file. Please ensure it matches the template.");
    }
  };

  const handleUpload = async () => {
    if (!parsedData || parsedData.some((r) => r.errors.length > 0)) {
      toast.error("Please fix invalid rows before uploading");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bulkUploadEmployees(parsedData.map(({ errors, rowNumber, ...emp }) => emp));
      if (res.success) {
        toast.success(res.message || "Bulk upload successful!");
        handleClose();
      } else {
        toast.error(res.error || "Failed to bulk upload employees", { duration: 10000 });
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
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const invalidCount = parsedData?.filter((r) => r.errors.length > 0).length ?? 0;
  const hasErrors = invalidCount > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : setOpen(true))}>
      <DialogTrigger render={<Button className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white shadow-sm transition-all"><UploadCloud className="w-4 h-4 mr-2" /> Bulk Upload</Button>} />

      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden bg-white border-0 shadow-2xl">
        <div className="bg-[#1e3a8a] p-6 text-white flex flex-row items-center gap-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <TableIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <DialogTitle className="text-2xl font-bold tracking-tight">Bulk Upload Employees</DialogTitle>
            <p className="text-white/80 mt-1 text-sm">Add or update your organization roster via Excel or CSV</p>
          </div>
        </div>

        <div className="p-6">
          {!parsedData ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">1. Download the template</h4>
                  <p className="text-sm text-slate-500 mt-1">Includes a sample row and an <strong>Instructions</strong> sheet describing every column.</p>
                </div>
                <Button onClick={handleDownloadTemplate} variant="outline" className="border-slate-300 text-[#1e3a8a] hover:text-[#1e3a8a] hover:bg-[#1e3a8a]/5">
                  <FileDown className="w-4 h-4 mr-2" /> Download .xlsx
                </Button>
              </div>

              <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-slate-700">
                <Info className="w-4 h-4 text-[#1e3a8a] shrink-0 mt-0.5" />
                <ul className="space-y-1 list-disc list-inside marker:text-slate-400">
                  <li>One employee per row. Keep the header row exactly as in the template; all columns except <strong>HRBP Name</strong> are required.</li>
                  <li>A <strong>new Emp ID is appended</strong>; an <strong>existing Emp ID only updates changed fields</strong> (replacing <code>-</code> placeholders when real values are provided, while preserving existing data &amp; assessments).</li>
                  <li><strong>Allowed Email Domains:</strong> {ALLOWED_DOMAINS_LABEL}.</li>
                  <li><strong>Manager Email</strong> must match the manager&apos;s login email, otherwise the employee won&apos;t appear on their dashboard.</li>
                  <li>Upload is all-or-nothing: if any row is invalid, nothing is saved.</li>
                </ul>
              </div>

              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
                  dragActive ? "border-[#059669] bg-[#059669]/5" : "border-slate-300 hover:border-[#1e3a8a] hover:bg-slate-50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto w-14 h-14 bg-[#1e3a8a]/10 text-[#1e3a8a] rounded-full flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">2. Upload the completed file</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                  Drag and drop your .xlsx or .csv file here, or click to browse. You&apos;ll review it before anything is saved.
                </p>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) processFile(e.target.files[0]);
                    e.target.value = ""; // allow re-selecting the same file after fixing it
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
                    Found {parsedData.length} rows.{" "}
                    {hasErrors ? (
                      <span className="text-[#e11d48] font-medium">{invalidCount} invalid - fix the file and re-upload.</span>
                    ) : (
                      <span className="text-[#059669] font-medium">All rows valid!</span>
                    )}
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
                      <TableHead className="font-semibold text-slate-700 w-[60px]">Row</TableHead>
                      <TableHead className="font-semibold text-slate-700 w-[100px]">Emp ID</TableHead>
                      <TableHead className="font-semibold text-slate-700">Name</TableHead>
                      <TableHead className="font-semibold text-slate-700">Email</TableHead>
                      <TableHead className="font-semibold text-slate-700">Role &amp; Dept</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row) => {
                      const isInvalid = row.errors.length > 0;
                      return (
                        <TableRow key={row.rowNumber} className={cn("border-b-slate-100", isInvalid ? "bg-red-50 hover:bg-red-50" : "bg-white hover:bg-slate-50")}>
                          <TableCell className="text-xs text-slate-400">{row.rowNumber}</TableCell>
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
                                <div className="text-[10px] text-[#e11d48] max-w-[220px] leading-tight font-medium whitespace-normal">
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
                  className={cn("text-white shadow-md font-bold transition-all px-8", hasErrors ? "bg-slate-300 hover:bg-slate-300" : "bg-[#059669] hover:bg-[#059669]/90")}
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
