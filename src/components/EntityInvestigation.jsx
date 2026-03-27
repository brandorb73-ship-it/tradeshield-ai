// ========================= EntityInvestigation.jsx =========================
import React from "react";
import { X } from "lucide-react";
import { generateEntityNarrative } from "../utils/aiNarratives";

const getColor = (value) => {
  if (value >= 70) return "bg-red-500";
  if (value >= 40) return "bg-orange-400";
  return "bg-green-500";
};

const getTextColor = (value) => {
  if (value >= 70) return "text-red-600";
  if (value >= 40) return "text-orange-500";
  return "text-green-600";
};

const BreakdownBar = ({ label, value = 0 }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs font-semibold">
      <span className="text-slate-600">{label}</span>
      <span className={getTextColor(value)}>{value}</span>
    </div>
    <div className="w-full bg-slate-200 h-2 rounded">
      <div
        className={`${getColor(value)} h-2 rounded transition-all`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

export default function EntityInvestigation({
  entity,
  profile = {},
  mastermind = {},
  onClose,
}) {
  const narrative = generateEntityNarrative(profile);

  const ers = profile?.ers || {};
  const summary = profile?.summary || {};

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose} // ✅ click outside closes
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()} // ✅ prevent close when clicking inside
      >
        {/* 🔥 HEADER */}
        <div className="flex justify-between items-center p-4 border-b bg-slate-50 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold">{entity}</h2>
            <p className="text-xs text-slate-500">Entity Investigation Panel</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* 🔥 BODY */}
        <div className="p-5 overflow-y-auto space-y-6">

          {/* 🔥 SCORE CARDS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-100">
              <p className="text-xs text-slate-500">ERS Score</p>
              <p className={`text-2xl font-bold ${getTextColor(ers?.total || 0)}`}>
                {ers?.total || 0}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-100">
              <p className="text-xs text-slate-500">Network Risk</p>
              <p className={`text-2xl font-bold ${getTextColor(mastermind?.score || 0)}`}>
                {mastermind?.score || 0}
              </p>
            </div>
          </div>

          {/* 🔥 RISK BREAKDOWN */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase text-slate-600">
              Risk Breakdown
            </h3>

            <BreakdownBar label="Self Trade" value={ers?.self} />
            <BreakdownBar label="HS Risk" value={ers?.hs} />
            <BreakdownBar label="Price Risk" value={ers?.price} />
            <BreakdownBar label="Density" value={ers?.density} />
            <BreakdownBar label="ML Risk" value={ers?.mlRisk} />
            <BreakdownBar label="Shell Risk" value={ers?.shellRisk} />
            <BreakdownBar label="Ring Score" value={ers?.ringScore} />
            <BreakdownBar label="Cycle Score" value={ers?.cycleScore} />
          </div>

          {/* 🔥 ACTIVITY SUMMARY */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-slate-500 text-xs">Shipments</p>
              <p className="font-bold">{summary?.totalShipments || 0}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-slate-500 text-xs">Self Trades</p>
              <p className="font-bold">{summary?.selfTrades || 0}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-slate-500 text-xs">HS Issues</p>
              <p className="font-bold">{summary?.hsIssues || 0}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-slate-500 text-xs">Price Issues</p>
              <p className="font-bold">{summary?.priceIssues || 0}</p>
            </div>
          </div>

          {/* 🔥 AI NARRATIVE */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-4 rounded-xl">
            <h3 className="text-sm font-bold mb-2 uppercase">
              AI Risk Narrative
            </h3>
            <p className="text-sm leading-relaxed opacity-90">
              {narrative}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
