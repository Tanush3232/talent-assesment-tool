"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, FileEdit, CheckCircle2, Search, ChevronDown, ArrowRight } from "lucide-react";
import Link from "next/link";

type AssessmentStatus = "PENDING" | "DRAFT" | "COMPLETED";

type Employee = {
  id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  entity: string;
  location: string;
  managerId: string;
  managerEmail: string;
  hrbpName: string | null;
  impactLevel: string;
  assessment: {
    id: string;
    status: AssessmentStatus;
    scores: any;
  } | null;
  managerName?: string;
};

type RollupView = "function" | "department" | "manager";
type StatusFilter = "ALL" | "PENDING" | "DRAFT" | "COMPLETED";

const statusConfig = {
  COMPLETED: { label: "COMPLETED", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  DRAFT: { label: "DRAFT", className: "bg-amber-100 text-amber-700 border-amber-200" },
  PENDING: { label: "PENDING", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-rose-100 text-rose-700",
    "bg-teal-100 text-teal-700",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function HRDirectoryClient({ employees }: { employees: Employee[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [fnFilter, setFnFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [hrbpFilter, setHrbpFilter] = useState("ALL");
  const [rollupView, setRollupView] = useState<RollupView>("function");

  // Derive unique filter options dynamically
  const functions = useMemo(() => {
    // Derive "function" from department (simplified mapping)
    const deptToFn: Record<string, string> = {};
    employees.forEach(e => { deptToFn[e.department] = e.department; });
    return ["ALL", ...Array.from(new Set(employees.map(e => e.department)))];
  }, [employees]);

  const departments = useMemo(() => ["ALL", ...Array.from(new Set(employees.map(e => e.department)))], [employees]);
  const managers = useMemo(() => ["ALL", ...Array.from(new Set(employees.map(e => e.managerName || e.managerEmail)))], [employees]);
  const entities = useMemo(() => ["ALL", ...Array.from(new Set(employees.map(e => e.entity)))], [employees]);
  const hrbps = useMemo(() => ["ALL", ...Array.from(new Set(employees.map(e => e.hrbpName || "Unassigned")))], [employees]);

  // Filtered list
  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const status = emp.assessment?.status || "PENDING";
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (fnFilter !== "ALL" && emp.department !== fnFilter) return false;
      if (deptFilter !== "ALL" && emp.department !== deptFilter) return false;
      if (managerFilter !== "ALL" && (emp.managerName || emp.managerEmail) !== managerFilter) return false;
      if (entityFilter !== "ALL" && emp.entity !== entityFilter) return false;
      if (hrbpFilter !== "ALL" && (emp.hrbpName || "Unassigned") !== hrbpFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !emp.name.toLowerCase().includes(q) &&
          !emp.id.toLowerCase().includes(q) &&
          !emp.designation.toLowerCase().includes(q) &&
          !emp.department.toLowerCase().includes(q) &&
          !emp.location.toLowerCase().includes(q) &&
          !(emp.managerName || "").toLowerCase().includes(q) &&
          !(emp.hrbpName || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [employees, search, statusFilter, fnFilter, deptFilter, managerFilter, entityFilter, hrbpFilter]);

  // Stats
  const total = employees.length;
  const pending = employees.filter(e => !e.assessment || e.assessment.status === "PENDING").length;
  const drafts = employees.filter(e => e.assessment?.status === "DRAFT").length;
  const completed = employees.filter(e => e.assessment?.status === "COMPLETED").length;

  // Rollup computation
  const rollupData = useMemo(() => {
    const groups: Record<string, { total: number; completed: number; hipos: number }> = {};
    employees.forEach(emp => {
      const key = rollupView === "function" 
        ? emp.department 
        : rollupView === "department" 
        ? emp.department 
        : (emp.managerName || emp.managerEmail);
      if (!groups[key]) groups[key] = { total: 0, completed: 0, hipos: 0 };
      groups[key].total++;
      if (emp.assessment?.status === "COMPLETED") groups[key].completed++;
      // HiPo detection (score >= 37)
      if (emp.assessment?.status === "COMPLETED" && emp.assessment.scores) {
        try {
          const scores = emp.assessment.scores as any;
          const ab = Object.values(scores.ability || {}).reduce((a: number, b: any) => a + Number(b), 0);
          const asp = Object.values(scores.aspiration || {}).reduce((a: number, b: any) => a + Number(b), 0);
          const lead = Object.values(scores.leadership || {}).reduce((a: number, b: any) => a + Number(b), 0);
          if ((ab as number) + (asp as number) + (lead as number) >= 37) groups[key].hipos++;
        } catch {}
      }
    });
    return Object.entries(groups).map(([name, data]) => ({
      name,
      ...data,
      progressPct: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      hipoDensity: data.total > 0 ? Math.round((data.hipos / data.total) * 100) : 0,
    }));
  }, [employees, rollupView]);

  return (
    <div className="space-y-6">
      {/* Stat Filter Cards */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`text-left p-5 rounded-xl border-2 transition-all ${statusFilter === "ALL" ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-200 hover:border-slate-300"}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-bold tracking-widest uppercase ${statusFilter === "ALL" ? "text-slate-400" : "text-slate-500"}`}>Total Directs</p>
            <Users className={`w-5 h-5 ${statusFilter === "ALL" ? "text-slate-400" : "text-slate-400"}`} />
          </div>
          <div className={`text-4xl font-black ${statusFilter === "ALL" ? "text-white" : "text-slate-900"}`}>{total}</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === "PENDING" ? "ALL" : "PENDING")}
          className={`text-left p-5 rounded-xl border-2 transition-all ${statusFilter === "PENDING" ? "bg-amber-50 border-amber-400 shadow" : "bg-white border-slate-200 hover:border-amber-200"}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Pending</p>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-4xl font-black text-slate-900">{pending}</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === "DRAFT" ? "ALL" : "DRAFT")}
          className={`text-left p-5 rounded-xl border-2 transition-all ${statusFilter === "DRAFT" ? "bg-blue-50 border-blue-400 shadow" : "bg-white border-slate-200 hover:border-blue-200"}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Drafts</p>
            <FileEdit className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-4xl font-black text-slate-900">{drafts}</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === "COMPLETED" ? "ALL" : "COMPLETED")}
          className={`text-left p-5 rounded-xl border-2 transition-all ${statusFilter === "COMPLETED" ? "bg-emerald-50 border-emerald-400 shadow" : "bg-white border-slate-200 hover:border-emerald-200"}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Completed</p>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-4xl font-black text-emerald-600">{completed}</div>
        </button>
      </div>

      {/* Organizational Roll-up Summaries */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Organizational Roll-up Summaries</h2>
            <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mt-0.5">Quick calibration status overview across the firm</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(["function", "department", "manager"] as RollupView[]).map(v => (
              <button
                key={v}
                onClick={() => setRollupView(v)}
                className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${rollupView === v ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                {v === "function" ? "Function View" : v === "department" ? "Department View" : "Manager View"}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                {rollupView === "manager" ? "Manager" : rollupView === "department" ? "Department" : "Business Function"}
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Total Headcount</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Calibration Progress</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Validated HiPos</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">HiPo Density</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Quick GCC Filter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rollupData.map(row => (
              <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{row.name}</td>
                <td className="px-4 py-4 text-slate-600 text-sm">{row.total}</td>
                <td className="px-4 py-4">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{row.progressPct}%</span>
                    <div className="text-xs text-slate-400 mt-0.5">({row.completed}/{row.total} Done)</div>
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-700 font-semibold text-sm">{row.hipos}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${row.hipoDensity >= 50 ? "bg-emerald-100 text-emerald-700" : row.hipoDensity > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                    {row.hipoDensity}.0%
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => {
                      setRollupView(rollupView);
                      if (rollupView === "department" || rollupView === "function") setDeptFilter(row.name);
                      else setManagerFilter(row.name);
                    }}
                    className="text-xs font-semibold text-slate-500 border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all"
                  >
                    Filter below
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, role, department..."
              className="pl-9 pr-4 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zuari-blue/30 w-56"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <FilterSelect label="FUNCTION" options={functions} value={fnFilter} onChange={setFnFilter} />
            <FilterSelect label="DEPT" options={departments} value={deptFilter} onChange={setDeptFilter} />
            <FilterSelect label="MANAGER" options={managers} value={managerFilter} onChange={setManagerFilter} />
            <FilterSelect label="ENTITY" options={entities} value={entityFilter} onChange={setEntityFilter} />
            <FilterSelect label="HRBP" options={hrbps} value={hrbpFilter} onChange={setHrbpFilter} />
          </div>

          {/* Active Filters Chip */}
          <div className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="text-slate-400">FILTERS ACTIVE:</span>
            <span className="bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-slate-700">
              Status: {statusFilter}
            </span>
          </div>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Talent Potential Registry Database</h2>
            <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mt-0.5">Live read access covering all operational units</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} employees shown</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">ID & Employee</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Role & Organization</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">HRBP</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Region & Location</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Evaluation Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                    No employees match your current filters.
                  </td>
                </tr>
              ) : filtered.map(emp => {
                const status = emp.assessment?.status || "PENDING";
                const sc = statusConfig[status];
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(emp.name)}`}>
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zuari-red font-mono">{emp.id}</span>
                          </div>
                          <div className="font-semibold text-slate-900 text-sm leading-tight">{emp.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-800 leading-tight">{emp.designation}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{emp.department} • {emp.entity}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-zuari-blue">{emp.hrbpName || <span className="text-slate-300 italic text-xs">Unassigned</span>}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{emp.location}</td>
                    <td className="px-4 py-4">
                      <Badge className={`text-xs font-bold border ${sc.className} hover:${sc.className}`}>
                        {sc.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      {status === "COMPLETED" ? (
                        <Link href={`/assessment/${emp.id}`}>
                          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all group-hover:shadow-sm">
                            View Assessment <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Awaiting Manager</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const displayValue = value === "ALL" ? `All ${label.charAt(0) + label.slice(1).toLowerCase()}s` : value;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{label}:</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none pr-7 pl-3 h-8 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zuari-blue/20 text-slate-700 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <option value="ALL">All {label.charAt(0) + label.slice(1).toLowerCase()}s</option>
          {options.filter(o => o !== "ALL").map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
