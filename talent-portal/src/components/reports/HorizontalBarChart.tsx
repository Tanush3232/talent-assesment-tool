"use client";

import { useMemo } from "react";

type Distribution = {
  hipo: number;
  promotable: number;
  wellPlaced: number;
};

export default function HorizontalBarChart({ distribution }: { distribution: Distribution }) {
  const total = distribution.hipo + distribution.promotable + distribution.wellPlaced;
  
  const hipoPct = total > 0 ? (distribution.hipo / total) * 100 : 0;
  const proPct = total > 0 ? (distribution.promotable / total) * 100 : 0;
  const wpPct = total > 0 ? (distribution.wellPlaced / total) * 100 : 0;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-slate-900">Talent Potential Distribution</h3>
        <p className="text-xs text-slate-500">Based on completed assessments</p>
      </div>
      
      {total === 0 ? (
        <div className="text-sm text-slate-400 text-center py-8">
          No data available to generate chart.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-zuari-blue">High Potential (HiPo)</span>
              <span className="text-slate-900">{distribution.hipo} ({Math.round(hipoPct)}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-zuari-blue rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${hipoPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-600">Promotable / Expandable</span>
              <span className="text-slate-900">{distribution.promotable} ({Math.round(proPct)}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${proPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">Well-placed</span>
              <span className="text-slate-900">{distribution.wellPlaced} ({Math.round(wpPct)}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-400 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${wpPct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
