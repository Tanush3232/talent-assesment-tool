"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Search, FileEdit, Trash2, ShieldAlert, Users } from "lucide-react";
import AddEmployeeDialog from "@/components/admin/AddEmployeeDialog";
import BulkUploadDialog from "@/components/admin/BulkUploadDialog";
import AddUserDialog from "@/components/admin/AddUserDialog";

type AssessmentStatus = "PENDING" | "DRAFT" | "COMPLETED";
type StatFilter = "ALL" | "CALIBRATED" | "DRAFT" | "PENDING";

const impactColors: Record<string, string> = {
  HIGH: "bg-zuari-blue/10 text-zuari-blue border-zuari-blue/20 font-bold",
  CRITICAL: "bg-zuari-red/10 text-zuari-red border-zuari-red/20 font-bold",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200 font-bold",
  LOW: "bg-slate-100 text-slate-600 border-slate-200 font-bold",
};

export default function AdminPageClient({ users, employees }: { users: any[]; employees: any[] }) {
  const [search, setSearch] = useState("");
  const [statFilter, setStatFilter] = useState<StatFilter>("ALL");
  const [activeTab, setActiveTab] = useState<"employees" | "users">("employees");

  const total = employees.length;
  const calibrated = employees.filter(e => e.assessment?.status === "COMPLETED").length;
  const drafts = employees.filter(e => e.assessment?.status === "DRAFT").length;
  const pending = employees.filter(e => !e.assessment || e.assessment.status === "PENDING").length;

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const status: AssessmentStatus = emp.assessment?.status || "PENDING";
      if (statFilter === "CALIBRATED" && status !== "COMPLETED") return false;
      if (statFilter === "DRAFT" && status !== "DRAFT") return false;
      if (statFilter === "PENDING" && status !== "PENDING") return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !emp.id.toLowerCase().includes(q) &&
          !emp.name.toLowerCase().includes(q) &&
          !emp.email.toLowerCase().includes(q) &&
          !emp.designation.toLowerCase().includes(q) &&
          !(emp.managerName || "").toLowerCase().includes(q) &&
          !emp.managerId.toLowerCase().includes(q) &&
          !emp.department.toLowerCase().includes(q) &&
          !emp.location.toLowerCase().includes(q) &&
          !(emp.hrbpName || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [employees, statFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Admin Center</h1>
          <p className="text-slate-500 mt-1">Manage system users, roles, and employee data.</p>
        </div>
        <div className="flex gap-3">
          <AddUserDialog />
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("employees")}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "employees" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
        >
          Employee Database
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "users" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
        >
          System Users
        </button>
      </div>

      {activeTab === "employees" && (
        <>
          {/* Stat Filter Buttons */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: "ALL" as StatFilter, label: "Total Directory Records", value: total, color: "text-slate-900", activeClass: "bg-slate-900 border-slate-900 text-white" },
              { key: "CALIBRATED" as StatFilter, label: "Calibrated Profiles", value: calibrated, color: "text-zuari-blue", activeClass: "bg-zuari-blue/10 border-zuari-blue" },
              { key: "DRAFT" as StatFilter, label: "Active Drafts", value: drafts, color: "text-amber-600", activeClass: "bg-amber-50 border-amber-400" },
              { key: "PENDING" as StatFilter, label: "Pending Intake", value: pending, color: "text-slate-400", activeClass: "bg-slate-50 border-slate-400" },
            ].map(({ key, label, value, color, activeClass }) => (
              <button
                key={key}
                onClick={() => setStatFilter(statFilter === key ? "ALL" : key)}
                className={`text-left p-5 rounded-xl border-2 transition-all ${statFilter === key ? activeClass + " shadow" : "bg-white border-slate-200 hover:border-slate-300"}`}
              >
                <p className={`text-[10px] font-bold tracking-widest uppercase ${statFilter === key && key === "ALL" ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
                <div className={`text-4xl font-black mt-2 ${statFilter === key && key === "ALL" ? "text-white" : color}`}>{value}</div>
              </button>
            ))}
          </div>

          {/* Search + Actions */}
          <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter by Emp ID, Name, Manager ID, Dept..."
                className="pl-9 pr-4 h-9 w-full text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zuari-blue/30"
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <AddEmployeeDialog />
              <BulkUploadDialog />
            </div>
          </div>

          {/* Full Employee Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Employee Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5">{filtered.length} of {total} records</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["EMP ID", "Employee Name", "Employee Email", "Designation", "Impact Level", "Employee Entity", "Manager Name", "Manager ID", "Manager Email", "Location", "Department", "HRBP", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-16 text-slate-400 text-sm">No employees match your filters.</td>
                    </tr>
                  ) : filtered.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-3 font-mono text-zuari-red text-xs font-bold whitespace-nowrap">{emp.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{emp.name}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{emp.email}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap max-w-[200px] truncate">{emp.designation}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`text-[10px] border ${impactColors[emp.impactLevel?.toUpperCase()] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {emp.impactLevel?.toUpperCase() || "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[160px] truncate">{emp.entity}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{emp.managerName}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs whitespace-nowrap">{emp.managerId}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{emp.managerEmail}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{emp.location}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{emp.department}</td>
                      <td className="px-4 py-3 font-semibold text-zuari-blue whitespace-nowrap">{emp.hrbpName || <span className="text-slate-300 italic text-xs">—</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-lg hover:bg-zuari-blue/10 text-slate-400 hover:text-zuari-blue transition-colors">
                            <FileEdit className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-zuari-red/10 text-slate-400 hover:text-zuari-red transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zuari-blue/10 rounded-lg text-zuari-blue">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Access Management</h3>
                <p className="text-sm text-slate-500">Only ADMINs can assign roles (Manager, HR, Admin)</p>
              </div>
            </div>
            <AddUserDialog />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-6 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{u.name}</td>
                    <td className="px-4 py-4 text-slate-500">{u.email}</td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className={
                        u.role === "ADMIN" ? "bg-zuari-red/10 text-zuari-red border-zuari-red/30" :
                        u.role === "HR" ? "bg-zuari-blue/10 text-zuari-blue border-zuari-blue/20" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      }>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={u.isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"}>
                        {u.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
