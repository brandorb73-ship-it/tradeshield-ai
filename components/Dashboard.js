import React, { useState } from 'react';
import Papa from 'papaparse'; 
import { AlertTriangle, ShieldCheck, Activity, Globe, Link as LinkIcon, Download } from 'lucide-react';

export default function Dashboard() {
  const [urlInput, setUrlInput] = useState(""); // State for the input field
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ selfTrade: 0, totalValue: 0, entities: 0 });

  const handleFetch = () => {
    if (!urlInput) return;
    setLoading(true);
    setError(null);

    Papa.parse(urlInput, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          analyzeFraud(results.data);
        } else {
          setError("No data found at this link.");
        }
        setLoading(false);
      },
      error: (err) => {
        setError("Failed to fetch. Ensure the link is a 'Public CSV' or 'Published to Web'.");
        setLoading(false);
      }
    });
  };

  const analyzeFraud = (rawData) => {
    // Detect Circular Risk: Exporter === Importer
    const selfTradeLogs = rawData.filter(row => 
      row.Exporter && row.Importer && 
      row.Exporter.trim().toLowerCase() === row.Importer.trim().toLowerCase()
    );

    // Calculate Total Value
    const totalVal = rawData.reduce((acc, row) => {
        const valStr = row['Amount($)'] || row['Amount'] || "0";
        const val = parseFloat(valStr.toString().replace(/[^0-9.]/g, '')) || 0;
        return acc + val;
    }, 0);

    const uniqueEntities = new Set([
        ...rawData.map(r => r.Exporter).filter(Boolean), 
        ...rawData.map(r => r.Importer).filter(Boolean)
    ]);

    setData(rawData);
    setStats({
      selfTrade: selfTradeLogs.length,
      totalValue: totalVal.toLocaleString(),
      entities: uniqueEntities.size
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Dynamic Header */}
      <nav className="bg-slate-900 text-white py-6 px-8 shadow-2xl border-b border-emerald-500/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" size={32} />
            <div>
              <h1 className="text-2xl font-black tracking-tighter">TRADESHIELD AI</h1>
              <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">Circular Trade Detector</p>
            </div>
          </div>

          {/* URL INPUT FIELD */}
          <div className="flex w-full md:w-2/3 gap-2">
            <div className="relative flex-grow">
              <LinkIcon className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Paste CSV / Google Sheets Public Link here..." 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-emerald-50"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
            <button 
              onClick={handleFetch}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-6 py-2 rounded-lg text-sm transition-all flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? "Analyzing..." : "Analyze Feed"}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                ⚠️ {error}
            </div>
        )}

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard title="Circular Risk (Self-Trade)" value={stats.selfTrade} color="text-red-600" icon={<AlertTriangle className="text-red-500" />} />
          <StatCard title="Trade Volume Analyzed" value={`$${stats.totalValue}`} color="text-slate-900" icon={<Activity className="text-blue-500" />} />
          <StatCard title="Active Entities" value={stats.entities} color="text-slate-900" icon={<Globe className="text-emerald-500" />} />
        </div>

        {/* Data Table */}
        {data.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
              <h2 className="text-lg font-bold">Transaction Intelligence Log</h2>
              <div className="flex gap-2">
                <span className="text-[10px] bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold border border-red-100 uppercase">Fraud Logic: Exporter == Importer</span>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0">
                  <tr>
                    <th className="p-4 px-6 border-b">Status</th>
                    <th className="p-4 border-b text-center">Date</th>
                    <th className="p-4 border-b">Exporter / Importer</th>
                    <th className="p-4 border-b">Brand</th>
                    <th className="p-4 border-b text-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row, i) => {
                    const isSelfTrade = row.Exporter?.trim().toLowerCase() === row.Importer?.trim().toLowerCase();
                    return (
                      <tr key={i} className={`${isSelfTrade ? 'bg-red-50/70' : ''} hover:bg-slate-50 transition-colors`}>
                        <td className="p-4 px-6 text-center">
                          {isSelfTrade ? <AlertTriangle size={18} className="text-red-600 inline" /> : <ShieldCheck size={18} className="text-emerald-500 inline" />}
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-500 whitespace-nowrap">{row.Date || row.date}</td>
                        <td className="p-4">
                          <div className={`font-bold text-sm ${isSelfTrade ? 'text-red-700' : 'text-slate-700'}`}>{row.Exporter}</div>
                          {isSelfTrade && <div className="text-[9px] text-red-500 font-bold uppercase tracking-widest mt-0.5">⚠️ Circular Trade Detected</div>}
                        </td>
                        <td className="p-4 text-sm font-medium">{row.Brand || row.brand}</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-800">
                          {row['Amount($)'] || row['Amount']}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <Download className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-xl font-bold text-slate-400">No Data Loaded</h3>
                <p className="text-slate-400 text-sm">Paste a CSV URL above to begin the fraud audit.</p>
            </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
          <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}
