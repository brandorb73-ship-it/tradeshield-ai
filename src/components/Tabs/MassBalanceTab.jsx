import React from 'react';

// Notice the "export" keyword before "const"
export default function MassBalanceTab({ stats }) {
  
  // 1. Safety Gate: Prevents the "Grey Screen" if data is missing
  const data = stats?.massBalance || {};
  const hasData = Object.keys(data).length > 0;

  if (!hasData) {
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
      {/* Header */}
      <div className="flex justify-between items-end border-b-8 border-blue-600 pb-6 mb-10">
        <h2 className="text-4xl font-black uppercase tracking-tighter">In-Out Reconciliation</h2>
        <span className="text-[10px] font-black uppercase bg-slate-100 px-4 py-2 rounded-full border border-slate-200 text-slate-500">
          Forensic Engine v2.4
        </span>
      </div>

      {/* Audit Cards */}
      <div className="grid grid-cols-1 gap-6">
        {Object.entries(data).map(([entity, brands]) => (
          Object.entries(brands || {}).map(([brand, w]) => {
            if (w.imp > 0 && w.exp > 0) {
              const match = (w.exp / w.imp) * 100;
              const isAnomaly = match > 105 || match < 95;

              return (
                <div key={entity + brand} className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-200 flex flex-col lg:flex-row justify-between items-center hover:bg-white transition-all shadow-sm">
                  <div>
                    <div className="text-[10px] font-black text-blue-600 uppercase mb-1">Audit Entity</div>
                    <div className="text-3xl font-black uppercase text-slate-900 tracking-tight">{entity}</div>
                    <div className="mt-2 inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Brand: {brand}
                    </div>
                  </div>

                  <div className="flex gap-10 items-center mt-6 lg:mt-0">
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Throughput</div>
                      <div className="text-xl font-black text-slate-900">
                        {w.imp.toLocaleString()}kg <span className="text-slate-300 mx-2">|</span> {w.exp.toLocaleString()}kg
                      </div>
                    </div>
                    <div className={`min-w-[140px] text-center px-6 py-4 rounded-2xl font-black text-3xl shadow-lg border-b-4 ${
                      isAnomaly ? 'bg-red-600 text-white border-red-900' : 'bg-emerald-600 text-white border-emerald-900'
                    }`}>
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
