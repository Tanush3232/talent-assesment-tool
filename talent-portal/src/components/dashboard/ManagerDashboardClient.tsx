"use client";

import { useState, useMemo } from "react";
import { Users, Clock, FileEdit, CheckCircle2, Search, ArrowRight, Play, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import ManagerOnboardingModal from "@/components/onboarding/ManagerOnboardingModal";

type StatusFilter = "ALL" | "PENDING" | "DRAFT" | "COMPLETED";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  const colors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700", "bg-rose-100 text-rose-700", "bg-teal-100 text-teal-700"];
  return colors[name.charCodeAt(0) % colors.length];
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "COMPLETED") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold text-xs">COMPLETED</Badge>;
  if (status === "DRAFT") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 font-bold text-xs">DRAFT</Badge>;
  return <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 font-bold text-xs">PENDING</Badge>;
}

export default function ManagerDashboardClient({
  employees,
  managerName,
  managerDept,
}: {
  employees: any[];
  managerName: string;
  managerDept: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [tourKey, setTourKey] = useState(0);

  const total = employees.length;
  const pending = employees.filter(e => !e.assessment || e.assessment.status === "PENDING").length;
  const drafts = employees.filter(e => e.assessment?.status === "DRAFT").length;
  const completed = employees.filter(e => e.assessment?.status === "COMPLETED").length;

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const status = emp.assessment?.status || "PENDING";
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !emp.name.toLowerCase().includes(q) &&
          !emp.designation.toLowerCase().includes(q) &&
          !emp.department.toLowerCase().includes(q) &&
          !emp.location.toLowerCase().includes(q) &&
          !emp.id.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [employees, statusFilter, search]);

  return (
    <>
      <ManagerOnboardingModal key={tourKey} managerName={managerName} />
      
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">My Direct Reports</h1>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("manager_tour_seen");
              setTourKey(k => k + 1);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200 shadow-sm shrink-0"
          >
            <Play className="w-3.5 h-3.5 text-zuari-blue fill-zuari-blue" />
            Product Tour
          </button>
        </div>

        {/* Info filter instruction */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium select-none">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Click the boxes to filter the team roster table below.</span>
        </div>

        {/* Stat Filter Cards */}
        <div data-tour="stat-cards" className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`text-left p-4 rounded-xl border-2 transition-all ${statusFilter === "ALL" ? "bg-slate-900 border-slate-900 text-white shadow-md" : "bg-white border-slate-200 hover:border-slate-300"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[10px] font-bold tracking-widest uppercase ${statusFilter === "ALL" ? "text-slate-400" : "text-slate-500"}`}>Total Directs</p>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className={`text-3xl font-extrabold ${statusFilter === "ALL" ? "text-white" : "text-slate-900"}`}>{total}</div>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === "PENDING" ? "ALL" : "PENDING")}
            className={`text-left p-4 rounded-xl border-2 transition-all ${statusFilter === "PENDING" ? "bg-amber-50 border-amber-400 shadow-sm" : "bg-white border-slate-200 hover:border-amber-200"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Pending</p>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{pending}</div>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === "DRAFT" ? "ALL" : "DRAFT")}
            className={`text-left p-4 rounded-xl border-2 transition-all ${statusFilter === "DRAFT" ? "bg-blue-50 border-blue-400 shadow-sm" : "bg-white border-slate-200 hover:border-blue-200"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Drafts</p>
              <FileEdit className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{drafts}</div>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === "COMPLETED" ? "ALL" : "COMPLETED")}
            className={`text-left p-4 rounded-xl border-2 transition-all ${statusFilter === "COMPLETED" ? "bg-emerald-50 border-emerald-400 shadow-sm" : "bg-white border-slate-200 hover:border-emerald-200"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Completed</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-600">{completed}</div>
          </button>
        </div>

        {/* Search + filter chip */}
        <div data-tour="search-bar" className="flex items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, role, department..."
              className="pl-9 pr-4 h-8 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zuari-blue/30"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-shrink-0">
            <span className="text-slate-400">FILTERS ACTIVE:</span>
            <span className="bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-slate-700">Status: {statusFilter}</span>
          </div>
        </div>

        {/* Team Table */}
        <div data-tour="team-table" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">ID & Employee</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Role & Organization</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Region & Location</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Evaluation Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400 text-sm">
                    No employees match current filters.
                  </td>
                </tr>
              ) : filtered.map((emp: any) => {
                const status = emp.assessment?.status || "PENDING";
                const canCalibrate = status === "PENDING" || status === "DRAFT";
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group text-sm">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarColor(emp.name)}`}>
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-zuari-red font-mono">{emp.id}</div>
                          <div className="font-semibold text-slate-900 text-[13px] leading-tight">{emp.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-semibold text-slate-800">{emp.designation}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{emp.department}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{emp.location}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3">
                      {canCalibrate ? (
                        <Link href={`/assessment/${emp.id}`}>
                          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow-sm whitespace-nowrap">
                            Start Assessment <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      ) : (
                        <Link href={`/assessment/${emp.id}`}>
                          <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-800 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all whitespace-nowrap">
                            View Assessment <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
