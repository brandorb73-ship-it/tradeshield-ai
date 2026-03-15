import React, { useState } from 'react';
import Papa from 'papaparse'; 
import { AlertTriangle, ShieldCheck, Activity, Globe, Link as LinkIcon, Download, Info, BarChart3, TrendingUp, Search } from 'lucide-react';

export default function Dashboard() {
  const [urlInput, setUrlInput] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ selfTrade: 0, totalValue: 0, entities: 0, fraudValue: 0, topBrand: "" });

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
          setError("No valid data found.");
        }
        setLoading(false);
      },
      error: () => {
        setError("Network error. Verify CSV link accessibility.");
        setLoading(false);
      }
    });
  };

  const analyzeFraud = (rawData) => {
    const selfTradeLogs = rawData.filter(row => 
      row.Exporter && row.Importer && 
      row.Exporter.trim().toLowerCase() === row.Importer.trim().toLowerCase()
    );

    const totalVal = rawData.reduce((acc, row) => {
        const val = parseFloat(row['Amount($)']?.toString().replace(/[^0-9.]/g, '')) || 0;
        return acc + val;
    }, 0);

    const fraudVal = selfTradeLogs.reduce((acc, row) => {
        const val = parseFloat(row['Amount($)']?.toString().replace(/[^0-9.]/g, '')) || 0;
        return acc + val;
    }, 0);

    const uniqueEntities = new Set([...rawData.map(r => r.Exporter), ...rawData.map(r => r.Importer)].filter(Boolean));

    setData(rawData);
    setStats({
      selfTrade: selfTradeLogs.length,
      totalValue: totalVal,
      fraudValue: fraudVal,
      entities: uniqueEntities.size,
      riskIndex: ((selfTradeLogs.length / rawData.length) * 100).toFixed(1)
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      {/* Navbar with Dark Blue Logo */}
      <nav className="bg-[#0f172a] text-white py-6 px-8 shadow-xl border-b border-blue-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1e293b] rounded-lg border border-blue-400">
                <ShieldCheck className="text-blue-400" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">TRADESHIELD <span className="text-blue-400 text-lg">PRO AI</span></h1>
            </div>
          </div>

          <div className="flex w-full md:w-2/3 gap-2">
            <input 
              type="text" 
              placeholder="Paste Audit Source URL..." 
              className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl py-3 px-5 text-lg focus:ring-2 focus:ring-blue-500 text-white outline-none"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button onClick={handleFetch} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-10 py-3 rounded-xl text-lg shadow-lg">
              {loading ? "PROCESSING..." : "AUDIT"}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {data.length > 0 && (
          <>
            {/* AI Summary Block */}
            <div className="mb-10 bg-slate-50 border-2 border-blue-100 rounded-3xl p-8 shadow-inner">
              <div className="flex items-center gap-2 mb-4 text-blue-900 font-black text-xl uppercase tracking-wider">
                <TrendingUp size={24} /> Forensic Summary
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-xl text-slate-800 leading-relaxed">
                   Analysis of {data.length} shipments reveals a <span className="font-bold text-red-600 underline">Risk Index of {stats.riskIndex}%</span>. 
                   The primary fraud pattern identified is <span className="font-bold">Circular Self-Trading</span>, 
                   accounting for <span className="font-bold text-blue-800">${stats.fraudValue.toLocaleString()}</span> in flagged capital movement.
                </div>
                <div className="bg-white p-6 rounded-2xl border border-blue-200">
                   <h4 className="font-black text-slate-900 mb-2 uppercase text-sm tracking-widest">Fraud Probability</h4>
                   <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden">
                      <div className="bg-red-600 h-full" style={{width: `${stats.riskIndex}%`}}></div>
                   </div>
                   <p className="mt-3 text-slate-700 font-bold">Nature of Fraud: Tax Evasion / Capital Flight</p>
                </div>
              </div>
            </div>

            {/* Pro Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-[#0f172a] p-8 rounded-3xl text-white shadow-2xl">
                 <p className="text-blue-400 font-black text-sm uppercase mb-2">Total Exposure</p>
                 <h2 className="text-5xl font-black">${stats.totalValue.toLocaleString()}</h2>
              </div>
              <div className="bg-white p-8 rounded-3xl border-4 border-red-600 shadow-xl">
                 <p className="text-red-600 font-black text-sm uppercase mb-2">Flagged Value (Self-Trade)</p>
                 <h2 className="text-5xl font-black text-red-600">${stats.fraudValue.toLocaleString()}</h2>
              </div>
              <div className="bg-white p-8 rounded-3xl border-4 border-slate-900 shadow-xl">
                 <p className="text-slate-900 font-black text-sm uppercase mb-2">Unique Entities</p>
                 <h2 className="text-5xl font-black text-slate-900">{stats.entities}</h2>
              </div>
            </div>

            {/* High Contrast Log */}
            <div className="bg-white rounded-[2rem] shadow-2xl border-2 border-slate-200 overflow-hidden">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <h2 className="text-2xl font-black uppercase">Transaction Intelligence</h2>
                    <span className="bg-blue-500 text-[10px] font-black px-4 py-2 rounded-full">AUDIT MODE ACTIVE</span>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-900 font-black text-sm uppercase">
                    <tr>
                      <th className="p-6">Entity Involved</th>
                      <th className="p-6">Product</th>
                      <th className="p-6">Origin/Dest</th>
                      <th className="p-6 text-right">Value ($)</th>
                      <th className="p-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-100">
                    {data.map((row, i) => {
                      const isFraud = row.Exporter === row.Importer;
                      return (
                        <tr key={i} className={`${isFraud ? 'bg-red-50' : ''}`}>
                          <td className="p-6">
                            <div className="text-xl font-black text-slate-900 uppercase">{row.Exporter}</div>
                            {isFraud && <div className="text-red-600 font-black text-xs">⚠️ CIRCULAR TRADE - HIGH RISK</div>}
                          </td>
                          <td className="p-6 font-bold text-slate-800 text-lg">{row.Brand}</td>
                          <td className="p-6 text-slate-700 font-bold">{row['Origin Country']} &rarr; {row['Destination Country']}</td>
                          <td className="p-6 text-right font-black text-2xl text-slate-900">{row['Amount($)']}</td>
                          <td className="p-6">
                             {isFraud ? 
                               <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-black text-xs">FLAGGED</span> : 
                               <span className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-black text-xs">CLEAR</span>
                             }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
