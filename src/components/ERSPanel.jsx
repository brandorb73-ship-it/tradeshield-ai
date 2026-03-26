// ========================= ERSPanel.jsx =========================
import React, { useMemo, useState } from "react";
import { useERS } from "../hooks/useERS";
import { useMastermind } from "../hooks/useMastermind";
import EntityInvestigation from "./EntityInvestigation";

const getColor = (value) => {
  if (value >= 70) return "bg-red-500";
  if (value >= 40) return "bg-orange-400";
  return "bg-green-500";
};

const Bar = ({ label, value }) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="w-full bg-gray-200 h-2 rounded">
      <div
        className={`${getColor(value)} h-2 rounded`}
        style={{ width: `${value}%` }}
        title={`Contribution: ${value}`}
      />
    </div>
  </div>
);

export default function ERSPanel({ stats }) {
  const ersData = useERS(stats);
  const mastermind = useMastermind(stats);
  const [selected, setSelected] = useState(null);

  const entities = useMemo(() => Object.entries(ersData || {}), [ersData]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Trade Intelligence Panel</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(entities || []).map(([entity, profile]) => (
          <div
            key={entity}
            className="border rounded-xl p-3 shadow cursor-pointer hover:bg-gray-50"
            onClick={() => setSelected({ entity, profile })}
          >
            <div className="flex justify-between">
              <h3 className="font-semibold">{entity}</h3>
              <span className="font-bold">{profile?.ers?.total || 0}</span>
            </div>

            <Bar label="HS Risk" value={profile?.ers?.hs || 0} />
            <Bar label="Price Risk" value={profile?.ers?.price || 0} />
            <Bar label="Network Risk" value={profile?.ers?.ringScore || 0} />
          </div>
        ))}
      </div>

      {selected && (
        <EntityInvestigation
          entity={selected.entity}
          profile={selected.profile}
          mastermind={mastermind?.[selected.entity]}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
