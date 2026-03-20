import React from 'react';

// We pass "stats" as a "prop" so this file can see the data
const MassBalance = ({ stats }) => {
  // 1. Safety Gate: if data isn't ready, don't crash
  if (!stats?.massBalance || Object.keys(stats.massBalance).length === 0) {
    return (
      <div className="py-32 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
        <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">
          Awaiting Reconciliation Data...
        </h3>
      </div>
    );
  }

  return (
    <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-slate-900 animate-in fade-in space-y-8">
      <div className="flex justify-between items-end border-b-8 border-blue-600 pb-6 mb-10">
        <h2 className="text-4xl font-black uppercase tracking-tighter">Weight Reconciliation</h2>
        <span className="text-[10px] font-black uppercase bg-slate-100 px-4 py-2 rounded-full">v2.4 Engine</span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(stats.massBalance).map(([entity, brands]) => (
          Object.entries(brands || {}).map(([brand, w]) => {
            if (w.imp > 0 && w.exp > 0) {
              const match = (w.exp / w.imp) * 100;
              const isAnomaly = match > 105 || match < 95;

              return (
                <div key={entity + brand} className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-200 flex justify-between items-center shadow-sm">
                  <div>
                    <div className="text-[10px] font-black text-blue-600 uppercase mb-1">Audit Entity</div>
                    <div className="text-3xl font-black uppercase text-slate-900">{entity}</div>
                    <div className="mt-2 inline-block bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">Brand: {brand}</div>
                  </div>

                  <div className="flex gap-8 items-center">
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase">Inbound vs Outbound</div>
                      <div className="text-xl font-black">
                        {w.imp.toLocaleString()}kg <span className="text-slate-300">|</span> {w.exp.toLocaleString()}kg
                      </div>
                    </div>
                    <div className={`px-8 py-5 rounded-[2rem] font-black text-3xl shadow-lg border-b-8 ${isAnomaly ? 'bg-red-600 text-white border-red-900' : 'bg-emerald-600 text-white border-emerald-900'}`}>
                      {match.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })
        ))}
      </div>
    </div>
  );
};

export default MassBalance;
