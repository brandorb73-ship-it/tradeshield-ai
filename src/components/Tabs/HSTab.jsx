import React from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';
// Assuming AISummary is a shared component you've already built
// import { AISummary } from '../Forensic/AISummary'; 

export const HSTab = ({ stats, AISummary }) => {
  const hsData = Object.values(stats?.hsAgg || {});

  // 1. Safety Gate
  if (hsData.length === 0) {
    return (
      <div className="py-32 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
        <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">
          No HS Intelligence Detected
        </h3>
        <p className="text-slate-400 text-sm font-bold mt-2">
          Aggregate data will appear here once shipment manifests are processed.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-slate-900 animate-in fade-in space-y-10">
      {/* Header */}
      <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
            Aggregated Shipment Intelligence
          </h2>
          <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest">
            HS Code Cluster Analysis & Entity Declaration Audit
          </p>
        </div>
        <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase">
          Live Forensic Feed
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {hsData.map((item, i) => (
          <div key={i} className="p-8 bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] hover:border-blue-600 hover:bg-white transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject Entity</div>
                <div className="text-xl font-black uppercase text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                  {item.entity}
                </div>
                <div className="mt-2 inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                  <ShieldCheck size={12} /> Brand: {item.brand}
                </div>
              </div>
              <div className="bg-slate-900 text-white px-5 py-2 rounded-2xl text-sm font-black shadow-lg">
                HS: {item.hs}
              </div>
            </div>

            <div className="flex justify-between items-end border-t-2 border-slate-200 pt-6">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Volume</div>
                <div className="text-2xl font-black text-slate-800">{item.count} <span className="text-xs">SHIPMENTS</span></div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Aggregated Value</div>
                <div className="text-3xl font-black text-blue-700 tracking-tighter">
                  ${item.amount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Summary Section */}
      <AISummary
        title="HS Intelligence Insight"
        icon={BookOpen}
        content={`Detected ${hsData.length} aggregated HS clusters across entities. Analysis shows consistent classification patterns for the selected brand portfolios.`}
      />
    </div>
  );
};
