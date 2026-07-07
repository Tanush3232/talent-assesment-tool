"use client";

import { useMemo } from "react";

type Distribution = {
  hipo: number;
  promotable: number;
  wellPlaced: number;
  hipoException: number;
};

export default function HorizontalBarChart({ distribution }: { distribution: Distribution }) {
  const hipoException = distribution.hipoException ?? 0;
  // Pure HiPo = hipo range scored AND no exception. Promotable shown as (promotable - hipoException) for "true" promotable bar.
  const purePromotable = Math.max(0, distribution.promotable - hipoException);
  const total = distribution.hipo + distribution.promotable + distribution.wellPlaced;

  const hipoPct = total > 0 ? (distribution.hipo / total) * 100 : 0;
  const proPct = total > 0 ? (purePromotable / total) * 100 : 0;
  const wpPct = total > 0 ? (distribution.wellPlaced / total) * 100 : 0;
  const exPct = total > 0 ? (hipoException / total) * 100 : 0;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-bold text-slate-900">Talent Potential Distribution</h3>
        <p className="text-[11px] text-slate-500">Based on completed assessments</p>
      </div>

      {total === 0 ? (
        <div className="text-sm text-slate-400 text-center py-8">
          No data available to generate chart.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-zuari-blue">High Potential (HiPo)</span>
              <span className="text-slate-900">{distribution.hipo} ({Math.round(hipoPct)}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-zuari-blue rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${hipoPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-emerald-600">Promotable / Expandable</span>
              <span className="text-slate-900">{purePromotable} ({Math.round(proPct)}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${proPct}%` }}
              />
            </div>
          </div>

          {hipoException > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-amber-600">HiPo Exception <span className="font-normal text-slate-400">(Promotable/Expandable)</span></span>
                <span className="text-slate-900">{hipoException} ({Math.round(exPct)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${exPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-500">Well-placed</span>
              <span className="text-slate-900">{distribution.wellPlaced} ({Math.round(wpPct)}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
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
