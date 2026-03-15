import React, { useState } from 'react';
import Papa from 'papaparse'; 
import { AlertTriangle, ShieldCheck, Activity, Globe, Link as LinkIcon, Download, Info } from 'lucide-react';

export default function Dashboard() {
  const [urlInput, setUrlInput] = useState("");
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
          setError("No valid data found at this link.");
        }
        setLoading(false);
      },
      error: (err) => {
        setError("Network error. Ensure the link is a publicly accessible CSV or Google Sheets link.");
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

    // Calculate Total Value using Amount($) or Amount column
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
      totalValue: totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      entities: uniqueEntities.size
    });
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-20">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white py-6 px-8 shadow-xl border-b border-red-500/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg">
                <ShieldCheck className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">TRADESHIELD AI</h1>
              <p className="text-[10px] text-red-400 font-mono tracking-widest uppercase">Global Anti-Fraud Engine</p>
            </div>
          </div>

          <div className="flex w-full md:w-2/3 gap-2">
            <div className="relative flex-grow">
              <LinkIcon className="absolute left-3 top-3 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Paste Public CSV URL (Google Sheets/Gist)..." 
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-white shadow-inner"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
            <button 
              onClick={handleFetch}
              disabled={loading}
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-2.5 rounded-xl text-sm shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
            >
              {loading ? "Scanning..." : "Audit Data"}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {error && (
            <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-lg flex items-center gap-3 shadow-sm">
                <Info size={20} /> <span className="text-sm font-medium">{error}</span>
            </div>
        )}

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Circular Risk</span>
              <AlertTriangle className="text-red-500" size={20} />
            </div>
            <div className="flex items-baseline gap-2">
                <h3 className="text-5xl font-black text-red-600 tracking-tighter">{stats.selfTrade}</h3>
                <span className="text-xs text-red-400 font-bold uppercase">Flags Found</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Volume Audited</span>
              <Activity className="text-blue-500" size={20} />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-400">$</span>
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stats.totalValue}</h3>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Entity Network</span>
              <Globe className="text-emerald-500" size={20} />
            </div>
            <div className="flex items-baseline gap-2">
                <h3 className="text-5xl font-black text-slate-900 tracking-tighter">{stats.entities}</h3>
                <span className="text-xs text-slate-400 font-bold uppercase">Nodes</span>
            </div>
          </div>
        </div>

        {/* Main Log */}
        {data.length > 0 ? (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Fraud Intelligence Log</h2>
                <p className="text-xs text-slate-500 mt-1">Cross-checking all international cigarette shipments</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-red-600 bg-red-50 px-4 py-2 rounded-full border border-red-100">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  SELF-TRADE DETECTION ACTIVE
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[700px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="p-6">Integrity</th>
                    <th className="p-6">Date</th>
                    <th className="p-6">Primary Party</th>
                    <th className="p-6">Product/Brand</th>
                    <th className="p-6">Weight</th>
                    <th className="p-6 text-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row, i) => {
                    const exporter = row.Exporter?.trim().toLowerCase();
                    const importer = row.Importer?.trim().toLowerCase();
                    const isFraud = exporter && importer && exporter === importer;

                    return (
                      <tr key={i} className={`${isFraud ? 'bg-red-50/60' : 'hover:bg-slate-50/50'} transition-all`}>
                        <td className="p-6">
                          {isFraud ? (
                            <div className="bg-red-600 text-white p-1.5 rounded-lg shadow-md shadow-red-200 inline-block">
                                <AlertTriangle size={16} />
                            </div>
                          ) : (
                            <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg inline-block">
                                <ShieldCheck size={16} />
                            </div>
                          )}
                        </td>
                        <td className="p-6 text-sm font-mono text-slate-400 whitespace-nowrap">{row.Date || 'N/A'}</td>
                        <td className="p-6">
                          <div className={`font-black text-sm ${isFraud ? 'text-red-700' : 'text-slate-700'}`}>
                            {row.Exporter || 'Unknown'}
                          </div>
                          {isFraud ? (
                            <div className="text-[9px] text-red-500 font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                                <span className="bg-red-500 w-1 h-1 rounded-full" /> Same Entity Export/Import
                            </div>
                          ) : (
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                To: {row.Importer}
                            </div>
                          )}
                        </td>
                        <td className="p-6">
                          <div className="text-sm font-bold text-slate-800">{row.Brand}</div>
                          <div className="text-[10px] text-slate-400 font-mono">HS: {row['HS Code']}</div>
                        </td>
                        <td className="p-6 text-xs font-bold text-slate-500">
                            {row['Weight(Kg)'] || row['Weight']} KG
                        </td>
                        <td className="p-6 text-right font-mono font-black text-slate-900">
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
            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Download className="text-slate-300" size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-300">Awaiting Data Feed</h3>
                <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto font-medium">
                    Provide a CSV link in the header to run a forensic analysis on global trade flows.
                </p>
            </div>
        )}
      </main>
    </div>
  );
}
