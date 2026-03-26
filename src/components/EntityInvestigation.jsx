// ========================= EntityInvestigation.jsx =========================
import React from "react";
import { generateEntityNarrative } from "../utils/aiNarratives";

const getColor = (value) => {
  if (value >= 70) return "bg-red-500";
  if (value >= 40) return "bg-orange-400";
  return "bg-green-500";
};

const BreakdownBar = ({ label, value }) => (
  <div className="mb-3">
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="w-full bg-gray-200 h-3 rounded">
      <div
        className={`${getColor(value)} h-3 rounded`}
        style={{ width: `${value}%` }}
        title={`Detailed Score: ${value}`}
      />
    </div>
  </div>
);

export default function EntityInvestigation({ entity, profile, mastermind, onClose }) {
  const narrative = generateEntityNarrative(profile);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 w-[600px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-bold">{entity}</h2>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold">ERS Score: {profile?.ers?.total}</h3>
          <h3 className="font-semibold">Network Score: {mastermind?.score || 0}</h3>
        </div>

        <div className="mb-4">
          <BreakdownBar label="Self Trade" value={profile?.ers?.self || 0} />
          <BreakdownBar label="HS Risk" value={profile?.ers?.hs || 0} />
          <BreakdownBar label="Price Risk" value={profile?.ers?.price || 0} />
          <BreakdownBar label="Density" value={profile?.ers?.density || 0} />
          <BreakdownBar label="ML Risk" value={profile?.ers?.mlRisk || 0} />
          <BreakdownBar label="Shell Risk" value={profile?.ers?.shellRisk || 0} />
          <BreakdownBar label="Ring Score" value={profile?.ers?.ringScore || 0} />
          <BreakdownBar label="Cycle Score" value={profile?.ers?.cycleScore || 0} />
        </div>

        <div className="mb-4">
          <h3 className="font-semibold">Activity Summary</h3>
          <p>Shipments: {profile?.summary?.totalShipments}</p>
          <p>Self Trades: {profile?.summary?.selfTrades}</p>
          <p>HS Issues: {profile?.summary?.hsIssues}</p>
          <p>Price Issues: {profile?.summary?.priceIssues}</p>
        </div>

        <div className="bg-gray-100 p-3 rounded">
          <h3 className="font-semibold mb-2">AI Risk Narrative</h3>
          <p className="text-sm">{narrative}</p>
        </div>
      </div>
    </div>
  );
}
