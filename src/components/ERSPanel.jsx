import React, { useState } from "react";
import useERS from "../hooks/useERS";
import useMastermind from "../hooks/useMastermind";
import EntityInvestigation from "./EntityInvestigation";

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

const getRiskLabel = (value) => {
  if (value >= 70) return "HIGH RISK";
  if (value >= 40) return "MEDIUM";
  return "LOW";
};

const Bar = ({ label, value = 0 }) => (
  <div className="mb-2">
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

export default function ERSPanel({ stats }) {
  const ersData = useERS(stats);
  const mastermind = useMastermind(stats);

  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("exporter");

  const entities = ersData || [];

  // ✅ Step 4: Filter by role
const filteredEntities = entities.filter(e =>
  view === "exporter"
    ? e.role === "exporter" || e.role === "both"
    : e.role === "importer" || e.role === "both"
);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Trade Intelligence Panel</h2>

      {/* ✅ Step 4: Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView("exporter")}
          className={`px-4 py-1 rounded-full text-sm font-semibold ${
            view === "exporter"
              ? "bg-black text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Exporters
        </button>

        <button
          onClick={() => setView("importer")}
          className={`px-4 py-1 rounded-full text-sm font-semibold ${
            view === "importer"
              ? "bg-black text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Importers
        </button>
      </div>

      {/* ✅ Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntities.map((profile) => {
          const score = profile?.ersScore || 0;

          return (
            <div
              key={profile.name}
              className="border rounded-xl p-4 shadow-lg cursor-pointer hover:shadow-xl hover:bg-gray-50 transition"
              onClick={() => setSelected(profile)}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">{profile.name}</h3>

                {/* ✅ Step 6: Score + hover explanation */}
                <span
                  title={`Why ${getRiskLabel(score)}:
Self Trade: ${profile?.breakdown?.self || 0}
HS Issues: ${profile?.breakdown?.hs || 0}
Price Issues: ${profile?.breakdown?.price || 0}
Network Signals: ${profile?.breakdown?.ringScore || 0}`}
                  className={`font-bold px-2 py-1 rounded text-white text-sm ${getColor(
                    score
                  )}`}
                >
                  {score}
                </span>
              </div>

              <div className="text-xs mb-2 font-bold">
                {getRiskLabel(score)}
              </div>

              <Bar label="HS Risk" value={profile?.breakdown?.hs} />
              <Bar label="Price Risk" value={profile?.breakdown?.price} />
              <Bar label="Network Risk" value={profile?.breakdown?.ringScore} />
            </div>
          );
        })}
      </div>

      {/* ✅ Investigation Modal */}
      {selected && (
        <EntityInvestigation
          entity={selected.name}
          profile={selected}
          mastermind={mastermind?.[selected.name] || {}}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
