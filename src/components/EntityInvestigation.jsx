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

  return (
    <div>
      <div className="flex justify-between text-xs font-bold">
        <span>{label}</span>
        <span>{val}</span>
      </div>
      <div className="w-full bg-slate-200 h-2 rounded">
        <div className={`${color} h-2 rounded`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
