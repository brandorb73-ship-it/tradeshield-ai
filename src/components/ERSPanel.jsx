import React from "react";
import { buildEntityProfile } from "../utils/buildEntityProfile";

export default function ERSPanel({
  data,
  stats,
  ersData,
  mastermindData,
  onSelectEntity
}) {
  return (
    <div className="space-y-6">

      <h2 className="text-2xl font-black">ERS Intelligence</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ersData.map((e) => {
          const m = mastermindData.find(x => x.name === e.name) || {};

          const profile = buildEntityProfile(e.name, data, stats);

          return (
            <div
              key={e.name}
              onClick={() => onSelectEntity(e)}
              className="bg-white p-5 rounded-xl border hover:shadow cursor-pointer"
            >
              <h3 className="font-bold text-lg">{e.name}</h3>

              <div className="text-3xl font-black text-red-600">
                {e.ersScore}
              </div>

              <div className="text-sm text-gray-600">
                {e.shipments} shipments
              </div>

              <div className="text-sm">
                {e.anomalies} anomalies
              </div>

              <div className="mt-3 text-sm">
                🧠 Mastermind: {m.mastermindScore || 0}
              </div>

              <div className="text-xs text-gray-500">
                Ring: {m.ring || 0} | Cycle: {m.cycle || 0}
              </div>

              <div className="mt-3 text-xs text-gray-400">
                Self: {profile.summary.selfTrades} | HS: {profile.summary.hsIssues}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
