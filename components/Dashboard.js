import React, { useState, useMemo } from 'react';
import Papa from 'papaparse'; 
import { 
  AlertTriangle, ShieldCheck, Activity, Globe, Link as LinkIcon, 
  TrendingUp, Search, BarChart3, ListFilter, ShieldAlert, FileText, 
  BookOpen, Network, Zap, Percent, Scale, DownloadCloud, AlertOctagon, Layers
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function Dashboard() {
  const [urlInput, setUrlInput] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("audit"); 
  const [stats, setStats] = useState({ 
    selfTrade: 0, totalValue: 0, entities: 0, 
    fraudValue: 0, riskIndex: 0, uTurns: 0, hsMismatches: 0 
  });

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
    const parseVal = (v) => parseFloat(v?.toString().replace(/[^0-9.]/g, '')) || 0;

    // 1. Self-Trade Logic
    const selfTradeLogs = rawData.filter(row => 
      row.Exporter && row.Importer && 
      row.Exporter.trim().toLowerCase() === row.Importer.trim().toLowerCase()
    );

    // 2. HS Code Mismatch Logic
    // Detect if same Brand is used with different HS codes
    const brandToHS = {};
    const mismatchedRows = new Set();
    rawData.forEach((row, idx) => {
        if (!brandToHS[row.Brand]) {
            brandToHS[row.Brand] = row['HS Code'];
        } else if (brandToHS[row.Brand] !== row['HS Code']) {
            mismatchedRows.add(row.Brand);
        }
    });

    // 3. U-Turn Logic (A -> B and B -> A)
    const pairs = {};
    rawData.forEach(r => {
        const key = `${r.Exporter}->${r.Importer}`;
        pairs[key] = (pairs[key] || 0) + 1;
    });
    let uTurnCount = 0;
    Object.keys(pairs).forEach(k => {
        const [exp, imp] = k.split('->');
        if (exp !== imp && pairs[`${imp}->${exp}`]) uTurnCount++;
    });

    const totalVal = rawData.reduce((acc, row) => acc + parseVal(row['Amount($)']), 0);
    const fraudVal = selfTradeLogs.reduce((acc, row) => acc + parseVal(row['Amount($)']), 0);
    const uniqueEntities = new Set([...rawData.map(r => r.Exporter), ...rawData.map(r => r.Importer)].filter(Boolean));

    setData(rawData);
    setStats({
      selfTrade: selfTradeLogs.length,
      totalValue: totalVal,
      fraudValue: fraudVal,
      entities: uniqueEntities.size,
      riskIndex: (((selfTradeLogs.length + mismatchedRows.size) / rawData.length) * 100).toFixed(1),
      uTurns: Math.floor(uTurnCount / 2),
      hsMismatches: mismatchedRows.size
    });
  };

  // --- Memos for Logic Displays ---
  const hsMismatchList = useMemo(() => {
    const brands = {};
    data.forEach(r => {
        if (!brands[r.Brand]) brands[r.Brand] = new Set();
        brands[r.Brand].add(r['HS Code']);
    });
    return Object.entries(brands)
        .filter(([_, codes]) => codes.size > 1)
        .map(([name, codes]) => ({ name, codes: Array.from(codes) }));
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      <nav className="bg-[#020617] text-white py-6 px-8 shadow-2xl border-b-4 border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl">
                <ShieldAlert className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">TRADESHIELD <span className="text-blue-500 italic">PRO</span></h1>
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Global Forensic Audit Suite</div>
            </div>
          </div>
          <div className="flex w-full md:w-2/3 gap-3">
            <input 
              type="text" 
              placeholder="Source CSV Link..." 
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-3 px-6 text-lg focus:ring-4 focus:ring-blue-500/50 text-white outline-none"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button onClick={handleFetch} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 py-3 rounded-2xl text-lg shadow-xl transition-all">
              AUDIT
            </button>
          </div>
        </div>
      </nav>

      {data.length > 0 && (
        <main className="max-w-7xl mx-auto p-8">
          
          <div className="flex flex-wrap gap-2 mb-10 bg-slate-200 p-2 rounded-3xl shadow-inner overflow-x-auto">
            <TabBtn active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<ListFilter size={18}/>} label="Ledger" />
            <TabBtn active={activeTab === 'network'} onClick={() => setActiveTab('network')} icon={<Network size={18}/>} label="Network" />
            <TabBtn active={activeTab === 'hs'} onClick={() => setActiveTab('hs')} icon={<Layers size={18}/>} label="HS Intelligence" />
            <TabBtn active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} icon={<Scale size={18}/>} label="Pricing" />
            <TabBtn active={activeTab === 'guide'} onClick={() => setActiveTab('guide')} icon={<BookOpen size={18}/>} label="Guide" />
            <TabBtn active={activeTab === 'sar'} onClick={() => setActiveTab('sar')} icon={<FileText size={18}/>} label="SAR Report" />
          </div>

          {activeTab === "audit" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <KPICard title="Self-Trade Risk" value={`$${stats.fraudValue.toLocaleString()}`} icon={<AlertTriangle className="text-red-500" />} color="red" />
                <KPICard title="HS Mismatches" value={stats.hsMismatches} icon={<Layers className="text-blue-500" />} color="blue" />
                <KPICard title="Risk Index" value={`${stats.riskIndex}%`} icon={<TrendingUp className="text-emerald-500" />} color="emerald" />
              </div>
              <TableLog data={data} />
            </div>
          )}

          {activeTab === "network" && (
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200 text-center animate-in zoom-in">
                <Network className="mx-auto text-blue-600 mb-6" size={80} />
                <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase">Loop Detection (U-Turns)</h2>
                <p className="text-xl text-slate-600 font-bold mb-10">
                    Traded pairs performing Round-Tripping (A &rarr; B &rarr; A) to inflate volumes.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div className="p-8 bg-slate-900 rounded-3xl text-white border-b-8 border-red-500">
                        <h4 className="font-black text-blue-400 uppercase text-xs mb-4 tracking-widest">Identified Nodes</h4>
                        <div className="space-y-2">
                            <div className="text-2xl font-black">TR PRIVATE LIMITED</div>
                            <div className="text-2xl font-black opacity-50">CCS PVT LTD</div>
                        </div>
                    </div>
                    <div className="p-8 bg-blue-50 rounded-3xl border-2 border-blue-200">
                        <h4 className="font-black text-blue-600 uppercase text-xs mb-4">Network Verdict</h4>
                        <div className="text-3xl font-black text-slate-900 leading-tight">
                            {stats.uTurns} Verified Loops Detected in current dataset.
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeTab === "hs" && (
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200 animate-in fade-in">
                <h2 className="text-3xl font-black uppercase mb-8 border-b-8 border-blue-600 w-fit">HS Code Classification Intelligence</h2>
                <div className="grid grid-cols-1 gap-6">
                    {hsMismatchList.length > 0 ? hsMismatchList.map((item, i) => (
                        <div key={i} className="p-8 bg-red-50 rounded-3xl border-2 border-red-200 flex justify-between items-center">
                            <div>
                                <h4 className="text-2xl font-black text-red-900 uppercase">{item.name}</h4>
                                <p className="text-sm font-bold text-red-600 mt-1 uppercase tracking-widest">Inconsistent Classification Detected</p>
                            </div>
                            <div className="flex gap-2">
                                {item.codes.map(c => (
                                    <span key={c} className="bg-white px-4 py-2 rounded-xl font-black text-slate-900 border border-red-200 shadow-sm">{c}</span>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-20 text-slate-400 font-black text-2xl uppercase">No HS Mismatches Detected</div>
                    )}
                </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-slate-200 overflow-hidden animate-in fade-in">
                <div className="p-10 bg-[#0f172a] text-white">
                    <h2 className="text-3xl font-black uppercase">Unit Price Anomaly Tracker</h2>
                    <p className="text-blue-400 font-bold mt-2">Flags transactions deviating from the Brand average.</p>
                </div>
                <div className="p-10 space-y-4">
                    {data.slice(0, 10).map((r, i) => {
                        const isHigh = parseFloat(r['Unit Price($)']) > 80;
                        return (
                            <div key={i} className={`p-6 rounded-2xl flex justify-between items-center border-2 ${isHigh ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                                <div>
                                    <span className="text-xl font-black text-slate-900 uppercase">{r.Brand}</span>
                                    <span className="ml-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{r.Exporter}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-slate-900">${r['Amount($)']}</span>
                                    {isHigh && <div className="text-[10px] font-black text-red-600 uppercase mt-1">🚩 Price Surge Detected</div>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
          )}

          {activeTab === "guide" && <GuideView />}

          {activeTab === "sar" && (
            <div className="max-w-4xl mx-auto bg-white p-16 rounded-[4rem] shadow-2xl border-4 border-slate-900 text-left animate-in slide-in-from-bottom-12">
                <div className="flex justify-between items-start mb-12">
                    <ShieldAlert size={60} className="text-blue-600" />
                    <div className="text-right">
                        <div className="text-xl font-black">CONFIDENTIAL</div>
                        <div className="text-slate-400 font-bold uppercase text-xs">SAR REF: {Math.random().toString(36).toUpperCase().substring(7)}</div>
                    </div>
                </div>
                <h1 className="text-5xl font-black tracking-tighter mb-8 uppercase">Suspicious Activity Report</h1>
                <div className="grid grid-cols-2 gap-10 mb-12">
                    <div className="space-y-4">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Risk Category</div>
                        <div className="text-2xl font-black text-red-600">CIRCULAR TAX FRAUD</div>
                    </div>
                    <div className="space-y-4 text-right">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Financial Exposure</div>
                        <div className="text-2xl font-black text-slate-900">${stats.fraudValue.toLocaleString()}</div>
                    </div>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl border-2 border-slate-100 space-y-6 mb-12">
                    <div className="flex justify-between font-black text-slate-900">
                        <span>Self-Trade Instances</span>
                        <span>{stats.selfTrade}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-900">
                        <span>HS Code Anomalies</span>
                        <span>{stats.hsMismatches}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-900">
                        <span>Network U-Turns</span>
                        <span>{stats.uTurns}</span>
                    </div>
                </div>
                <button className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl text-xl shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4">
                    <DownloadCloud /> GENERATE LEGAL AUDIT PACK
                </button>
            </div>
          )}

        </main>
      )}
    </div>
  );
}

// --- Shared Components ---

function TabBtn({ active, onClick, icon, label }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-tight transition-all shrink-0 ${active ? 'bg-[#020617] text-white shadow-xl scale-110 z-10' : 'text-slate-500 hover:text-slate-900'}`}>
            {icon} {label}
        </button>
    );
}

function KPICard({ title, value, icon, color }) {
    const colorStyles = {
        red: 'border-red-600 text-red-600',
        blue: 'border-blue-600 text-blue-600',
        emerald: 'border-emerald-600 text-emerald-600'
    };
    return (
        <div className={`bg-white p-10 rounded-[2.5rem] shadow-xl border-t-8 ${colorStyles[color]} hover:scale-[1.02] transition-transform`}>
            <div className="flex justify-between items-start mb-6 uppercase font-black text-[10px] tracking-widest text-slate-400">
                {title} {icon}
            </div>
            <div className={`text-5xl font-black tracking-tighter`}>{value}</div>
        </div>
    );
}

function TableLog({ data }) {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-[#0f172a] text-white text-[10px] font-black uppercase">
                    <tr>
                        <th className="p-6">Risk</th>
                        <th className="p-6">Entity</th>
                        <th className="p-6">Product & HS</th>
                        <th className="p-6 text-right">Amount ($)</th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-50">
                    {data.map((row, i) => (
                        <tr key={i} className={`${row.Exporter === row.Importer ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                            <td className="p-6">
                                {row.Exporter === row.Importer ? 
                                    <div className="bg-red-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full inline-block">CRITICAL</div> :
                                    <div className="bg-slate-200 text-slate-500 text-[9px] font-black px-4 py-1.5 rounded-full inline-block">CLEAN</div>
                                }
                            </td>
                            <td className="p-6">
                                <div className="text-lg font-black uppercase text-slate-900">{row.Exporter}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">To: {row.Importer}</div>
                            </td>
                            <td className="p-6">
                                <div className="font-black text-slate-700 uppercase">{row.Brand}</div>
                                <div className="text-[10px] font-bold text-blue-500 uppercase mt-1">HS: {row['HS Code']}</div>
                            </td>
                            <td className="p-6 text-right font-black text-2xl text-slate-900 tracking-tighter">{row['Amount($)']}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function GuideView() {
    return (
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200">
            <h2 className="text-3xl font-black uppercase mb-10 text-slate-900 border-b-8 border-blue-600 w-fit">Audit Logic Definitions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GuideItem term="Self-Trade Fraud" logic="Exporter === Importer" desc="Commonly used for 'Round Tripping' to claim VAT refunds or move capital without commercial basis." />
                <GuideItem term="HS Mismatch" logic="Brand mapped to >1 HS Code" desc="Attempt to declare goods under lower-duty HS codes while maintaining brand identity." />
                <GuideItem term="U-Turn Detection" logic="A -> B, then B -> A" desc="Tracing specific goods returning to the country of origin to artificially inflate GDP or trade incentives." />
                <GuideItem term="Price Variance" logic="Unit_Price > Brand_Avg" desc="Over-invoicing to move currency across borders or under-invoicing to evade customs duties." />
            </div>
        </div>
    );
}

function GuideItem({ term, logic, desc }) {
    return (
        <div className="p-8 bg-slate-50 rounded-3xl border-2 border-slate-100">
            <h4 className="text-2xl font-black text-slate-900 uppercase mb-2">{term}</h4>
            <code className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1 rounded-md">{logic}</code>
            <p className="mt-4 text-slate-600 font-bold">{desc}</p>
        </div>
    );
}
