import React, { useMemo } from "react";
import { buildEntityProfile } from "../analytics/entityInvestigationEngine";
import { buildEuropolSignals } from "../analytics/europolEngine";

export default function EntityInvestigation({
  entity,
  data,
  stats,
  fraudStats,
  onSelectEntity // 👈 NEW for drill-down
}) {

  const profile = useMemo(() => {
    return buildEntityProfile(entity, data, stats);
  }, [entity, data, stats]);

  if (!profile) return null;

  const europol = useMemo(() => {
  return buildEuropolSignals(entity, data, stats);
}, [entity, data, stats]);
  
  const { summary, topRoutes, topBrands, linkedEntities, ers } = profile;

  const exportValue = data
    .filter(r => r.Exporter === entity)
    .reduce((a, b) => a + (b["Amount($)"] || 0), 0);
  
  const importValue = data
    .filter(r => r.Importer === entity)
    .reduce((a, b) => a + (b["Amount($)"] || 0), 0);

  return (
    <div className="bg-white p-8 rounded-3xl border-4 border-slate-900 shadow-2xl mt-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black uppercase">
          Investigation: {entity}
        </h2>

        <div className="text-right">
          <div className="text-xs uppercase text-slate-500 font-bold">ERS Score</div>
          <div className="text-4xl font-black text-red-600">
            {Number(ers?.finalScore || 0).toFixed(1)}
          </div>
        </div>
      </div>
      
      {/* CORE METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

        <Stat label="Total Value" value={`$${summary.totalValue.toLocaleString()}`} />
        <Stat label="Shipments" value={summary.totalShipments} />
        <Stat label="Exports" value={`$${exportValue.toLocaleString()}`} />
        <Stat label="Imports" value={`$${importValue.toLocaleString()}`} />

      </div>
{/* 🔍 ERS AUDIT TRACE */}
{profile?.ers?.audit && (
  <div className="bg-slate-50 p-4 rounded-xl border mt-6">
    <h3 className="font-bold mb-3">🔍 ERS Score Breakdown</h3>

{Object.entries(profile?.ers || {})
  .filter(([k]) => k !== "total")
  .map(([k, v]) => (
    <div key={k} className="flex justify-between text-xs">
      <span className="uppercase">{k}</span>
      <span>{v}</span>
    </div>
))}

    <div className="mt-3 border-t pt-2 text-sm font-bold flex justify-between">
      <span>Total</span>
      <span>
        {profile.ers.audit.raw.toFixed(2)} / {profile.ers.audit.maxScore}
      </span>
    </div>

    <div className="text-xs text-slate-500 mt-1">
      Final ERS: {profile.ers.finalScore.toFixed(1)} / 100
    </div>
  </div>
)}
      {/* FRAUD BREAKDOWN */}
      <div className="mb-8">
        <h3 className="font-black mb-3 text-sm uppercase text-slate-500">
          Fraud Signals
        </h3>

        <div className="space-y-2">
          <Bar label="Self Trade" val={summary.selfTrades} total={summary.totalShipments} color="bg-red-600" />
          <Bar label="HS Mismatch" val={summary.hsFlags} total={summary.totalShipments} color="bg-orange-500" />
          <Bar label="Price Anomaly" val={summary.priceFlags} total={summary.totalShipments} color="bg-purple-600" />
          <Bar label="Density" val={summary.densityFlags} total={summary.totalShipments} color="bg-yellow-500" />
        </div>
      </div>

      <div className="mb-8">
  <h3 className="font-black mb-3 text-sm uppercase text-slate-500">
    Europol Intelligence
  </h3>

  <div className="space-y-2">

    <Bar label="Shell Risk" val={europol?.shellScore || 0} total={100} color="bg-red-700" />
    <Bar label="Fraud Ring" val={europol?.ringScore || 0} total={100} color="bg-orange-600" />
    <Bar label="Cycle Risk" val={europol?.cycleScore || 0} total={100} color="bg-yellow-500" />
    <Bar label="ML Anomaly" val={europol?.mlScore || 0} total={100} color="bg-purple-600" />
    <Bar label="Corridor Risk" val={europol?.corridorRisk || 0} total={100} color="bg-blue-600" />

  </div>
</div>
      
      {/* ROUTES + BRANDS */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">

        <div>
          <h3 className="font-black text-sm uppercase text-slate-500 mb-3">
            Top Routes
          </h3>
          {topRoutes.map(([r, v]) => (
            <div key={r} className="flex justify-between text-sm border-b py-1">
              <span>{r}</span>
              <span className="font-bold">${v.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-black text-sm uppercase text-slate-500 mb-3">
            Brands
          </h3>
          {topBrands.map(([b, v]) => (
            <div key={b} className="flex justify-between text-sm border-b py-1">
              <span>{b}</span>
              <span className="font-bold">${v.toLocaleString()}</span>
            </div>
          ))}
        </div>

      </div>

      {/* LINKED ENTITIES (NETWORK) */}
      <div>
        <h3 className="font-black text-sm uppercase text-slate-500 mb-3">
          Linked Entities
        </h3>

        <div className="flex flex-wrap gap-2">
          {linkedEntities.map(([e, v]) => (
            <button
              key={e}
              onClick={() => onSelectEntity && onSelectEntity(e)}
              className="px-3 py-1 bg-slate-900 text-white text-xs rounded-full hover:bg-blue-600"
            >
              {e} (${Math.round(v)})
            </button>
          ))}
        </div>
      </div>

      {/* FLAGS */}
      <div className="mt-6 flex gap-4 text-xs font-bold">
        {fraudStats?.vat?.includes(entity) && (
          <span className="bg-red-600 text-white px-3 py-1 rounded">VAT RING</span>
        )}
      </div>

    </div>
  );
}

/* --- SMALL COMPONENTS --- */

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border">
      <div className="text-xs uppercase text-slate-500 font-bold">{label}</div>
      <div className="text-xl font-black">{value}</div>
    </div>
  );
}

function Bar({ label, val, total, color }) {
  const pct = total ? (val / total) * 100 : 0;

  const explanations = {
    "Shell Risk":
      "Likelihood the entity behaves like a shell company (low value trades, few partners, self-trading patterns).",

    "Fraud Ring":
      "Indicates participation in coordinated fraud networks based on repeated HS mismatches, price anomalies, and structured trade patterns.",

    "Cycle Risk":
      "Detects potential VAT carousel loops where goods circulate between the same entities/countries.",

    "ML Anomaly":
      "Statistical anomaly score based on unusually high or low transaction values.",

    "Corridor Risk":
      "Exposure to high-risk trade routes commonly associated with illicit flows (e.g. China, UAE, Turkey)."
  };

  return (
    <div className="group relative">
      
      {/* LABEL + VALUE */}
      <div className="flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span>{Number(val).toFixed(2)}</span>
      </div>

      {/* BAR */}
      <div className="w-full bg-slate-200 h-2 rounded">
        <div
          className={`${color} h-2 rounded`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* TOOLTIP */}
      <div className="absolute left-0 top-full mt-2 w-64 bg-black text-white text-xs p-3 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
        <div className="font-bold mb-1">{label}</div>
        <div>{explanations[label]}</div>

        <div className="mt-2 text-slate-300">
          Score: {Number(val).toFixed(2)} / 100
        </div>
      </div>

    </div>
  );
}
