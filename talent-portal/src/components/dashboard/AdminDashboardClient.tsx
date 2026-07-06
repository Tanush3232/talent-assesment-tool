"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import HorizontalBarChart from "@/components/reports/HorizontalBarChart";

function StatusBadge({ status }: { status?: string }) {
  if (status === "COMPLETED") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
  if (status === "DRAFT") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
  return <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100">Not Started</Badge>;
}

export default function AdminDashboardClient({ data }: { data: any }) {
  const { stats, notStarted, recentAssessments } = data;
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Overview</h1>
        <p className="text-slate-500 mt-1">Organization-wide talent assessment cycle status.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Eligible", value: stats.total, color: "text-slate-900" },
          { label: "Completed", value: stats.completed, color: "text-emerald-600" },
          { label: "Drafts", value: stats.drafts, color: "text-amber-600" },
          { label: "Not Started", value: notStarted, color: "text-slate-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-500">{label}</p>
            <div className={`text-4xl font-black mt-2 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center">
          <p className="text-sm font-bold text-slate-700 mb-4">Company Progress</p>
          <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-8 border-slate-100">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-emerald-500" strokeDasharray="289" strokeDashoffset={289 - (289 * progress) / 100} strokeLinecap="round" />
            </svg>
            <div className="text-center">
              <div className="text-4xl font-black text-slate-900">{progress}%</div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Completed</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <HorizontalBarChart distribution={data.distribution} />
        </div>
      </div>
    </div>
  );
}
