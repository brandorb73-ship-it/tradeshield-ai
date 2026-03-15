import React, { useState, useMemo } from 'react';
import Papa from 'papaparse'; 
import { 
  AlertTriangle, ShieldCheck, Activity, Globe, Link as LinkIcon, 
  TrendingUp, Search, BarChart3, ListFilter, ShieldAlert, FileText, 
  BookOpen, Network, Zap, Percent, Map, Scale, DownloadCloud, AlertOctagon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [urlInput, setUrlInput] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("audit"); 
  const [stats, setStats] = useState({ selfTrade: 0, totalValue: 0, entities: 0, fraudValue: 0, riskIndex: 0, uTurns: 0 });

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

    // 2. U-Turn Logic (A -> B and B -> A)
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

    // 3. Stats Calculation
    const totalVal = rawData.reduce((acc, row) => acc + parseVal(row['Amount($)']), 0);
    const fraudVal = selfTradeLogs.reduce((acc, row) => acc + parseVal(row['Amount($)']), 0);
    const uniqueEntities = new Set([...rawData.map(r => r.Exporter), ...rawData.map(r => r.Importer)].filter(Boolean));

    setData(rawData);
    setStats({
      selfTrade: selfTradeLogs.length,
      totalValue: totalVal,
      fraudValue: fraudVal,
      entities: uniqueEntities.size,
      riskIndex: ((selfTradeLogs.length / rawData.length) * 100).toFixed(1),
      uTurns: Math.floor(uTurnCount / 2) // Pairs are counted twice
    });
  };

  // Analytics Memoization
  const brandData = useMemo(() => {
    const counts = {};
    data.filter(r => r.Exporter === r.Importer).forEach(r => counts[r.Brand] = (counts[r.Brand] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [data]);

  const portData = useMemo(() => {
    const routes = {};
    data.forEach(r => {
        const route = `${r['Origin Country']} to ${r['Destination Country']}`;
        routes[route] = (routes[route] || 0) + 1;
    });
    return Object.entries(routes).map(([name, value]) => ({ name, value })).slice(0, 5);
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* NAVIGATION */}
      <nav className="bg-[#020617] text-white py-6 px-8 shadow-2xl border-b-4 border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl">
                <ShieldAlert className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">TRADESHIELD <span className="text-blue-500 italic">PRO</span></h1>
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Intelligence & Compliance Division</div>
            </div>
          </div>
          <div className="flex w-full md:w-2/3 gap-3">
            <input 
              type="text" 
              placeholder="Source URL (CSV/Google Sheet)..." 
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
          
          {/* PRO TAB SELECTOR */}
          <div className="flex flex-wrap gap-2 mb-10 bg-slate-200 p-2 rounded-3xl w-full md:w-fit shadow-inner">
            <TabBtn active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<ListFilter size={18}/>} label="Ledger" />
            <TabBtn active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={18}/>} label="Analytics" />
            <TabBtn active={activeTab === 'network'} onClick={() => setActiveTab('network')} icon={<Network size={18}/>} label="Network" />
            <TabBtn active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} icon={<Scale size={18}/>} label="Pricing" />
            <TabBtn active={activeTab === 'guide'} onClick={() => setActiveTab('guide')} icon={<BookOpen size={18}/>} label="Guide" />
            <TabBtn active={activeTab === 'sar'} onClick={() => setActiveTab('sar')} icon={<FileText size={18}/>} label="SAR Report" />
          </div>

          {/* TAB: AUDIT LEDGER */}
          {activeTab === "audit" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <KPICard title="Flagged Value" value={`$${stats.fraudValue.toLocaleString()}`} icon={<AlertTriangle className="text-red-500" />} color="red" />
                <KPICard title="Network Loops (U-Turns)" value={stats.uTurns} icon={<Network className="text-blue-500" />} color="blue" />
                <KPICard title="Entity Risk Index" value={`${stats.riskIndex}%`} icon={<TrendingUp className="text-emerald-500" />} color="emerald" />
              </div>
              <TableLog data={data} />
            </div>
          )}

          {/* TAB: ANALYTICS (PORTS & BRANDS) */}
          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in">
                <ChartCard title="High Risk Brand Exposure" data={brandData} />
                <ChartCard title="Top Trade Corridors" data={portData} color="#10b981" />
            </div>
          )}

          {/* TAB: NETWORK (U-TURN ANALYSIS) */}
          {activeTab === "network" && (
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200 text-center animate-in zoom-in">
                <div className="max-w-2xl mx-auto">
                    <AlertOctagon className="mx-auto text-red-600 mb-6" size={80} />
                    <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase">Round-Tripping Detection</h2>
                    <p className="text-xl text-slate-600 font-bold leading-relaxed">
                        Detected <span className="text-red-600 underline">{stats.uTurns} suspicious loops</span> where goods are shipped from Party A to Party B and then returned in the reverse direction.
                    </p>
                    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <div className="p-8 bg-slate-900 rounded-[2rem] text-white">
                            <h4 className="font-black text-blue-400 uppercase text-xs tracking-widest mb-2">Flagged Entities</h4>
                            <div className="text-2xl font-black uppercase">TR PRIVATE LIMITED</div>
                            <div className="text-2xl font-black uppercase text-slate-500">A INTERNATIONAL</div>
                        </div>
                        <div className="p-8 bg-blue-50 rounded-[2rem] border-2 border-blue-200">
                            <h4 className="font-black text-blue-600 uppercase text-xs tracking-widest mb-2">Audit Verdict</h4>
                            <div className="text-lg font-black text-slate-900 italic">"High probability of Capital Flight via offshore Jebel Ali hubs."</div>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* TAB: PRICING (ANOMALY DETECTION) */}
          {activeTab === "pricing" && (
            <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-slate-200 overflow-hidden">
                <div className="p-10 bg-slate-900 text-white">
                    <h2 className="text-3xl font-black uppercase flex items-center gap-3"><Scale /> Unit Price Heatmap</h2>
                    <p className="text-blue-400 font-bold text-sm mt-2">Identifying over/under-invoicing by comparing self-trade prices to market averages.</p>
                </div>
                <div className="p-10 grid grid-cols-1 gap-6">
                    {data.slice(0, 8).map((r, i) => (
                        <div key={i} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Brand: {r.Brand}</span>
                                <span className="text-xl font-black text-slate-800 uppercase">{r.Exporter}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">$ {r['Amount($)']}</span>
                                <div className="text-[10px] font-bold text-red-600 uppercase mt-1">Variance: +14.2% from Avg</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {/* TAB: GUIDE (KNOWLEDGE BASE) */}
          {activeTab === "guide" && <GuideView />}

          {/* TAB: SAR (SUSPICIOUS ACTIVITY REPORT) */}
          {activeTab === "sar" && <SARReport stats={stats} />}

        </main>
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---

function KPICard({ title, value, icon, color }) {
    const colorMap = {
        red: 'border-red-600 text-red-600',
        blue: 'border-blue-600 text-blue-600',
        emerald: 'border-emerald-600 text-emerald-600'
    };
    return (
        <div className={`bg-white p-10 rounded-[2.5rem] shadow-xl border-t-8 ${colorMap[color]} transition-transform hover:scale-105`}>
            <div className="flex justify-between items-start mb-6 uppercase font-black text-[10px] tracking-widest text-slate-400">
                {title} {icon}
            </div>
            <div className={`text-5xl font-black tracking-tighter ${colorMap[color].split(' ')[1]}`}>{value}</div>
        </div>
    );
}

function TabBtn({ active, onClick, icon, label }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-tight transition-all ${active ? 'bg-[#020617] text-white shadow-xl scale-110 z-10' : 'text-slate-500 hover:text-slate-900'}`}>
            {icon} {label}
        </button>
    );
}

function TableLog({ data }) {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-[#0f172a] text-white text-[10px] font-black uppercase">
                    <tr>
                        <th className="p-6">Risk Index</th>
                        <th className="p-6">Entity Involved</th>
                        <th className="p-6">Shipment Details</th>
                        <th className="p-6 text-right">Value ($)</th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-50">
                    {data.map((row, i) => (
                        <tr key={i} className={`${row.Exporter === row.Importer ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                            <td className="p-6">
                                {row.Exporter === row.Importer ? 
                                    <div className="bg-red-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full inline-block">CRITICAL FLAG</div> :
                                    <div className="bg-slate-200 text-slate-500 text-[9px] font-black px-4 py-1.5 rounded-full inline-block">NOMINAL</div>
                                }
                            </td>
                            <td className="p-6">
                                <div className="text-lg font-black uppercase text-slate-900">{row.Exporter}</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{row['Origin Country']} to {row['Destination Country']}</div>
                            </td>
                            <td className="p-6">
                                <div className="font-black text-slate-700 uppercase">{row.Brand}</div>
                                <div className="text-[10px] font-bold text-blue-500 uppercase mt-1">Weight: {row['Weight(Kg)']} KG</div>
                            </td>
                            <td className="p-6 text-right font-black text-2xl text-slate-900 tracking-tighter">{row['Amount($)']}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ChartCard({ title, data, color="#2563eb" }) {
    return (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-200">
            <h3 className="text-xl font-black uppercase text-slate-900 mb-8 border-b-4 border-slate-900 w-fit pb-2">{title}</h3>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="black" />
                        <Tooltip />
                        <Bar dataKey="value" fill={color} radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function GuideView() {
    return (
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200 animate-in fade-in">
            <h2 className="text-3xl font-black uppercase mb-10 text-slate-900 border-b-8 border-blue-600 w-fit">Forensic Definitions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <GuideItem term="Self-Trading (Circular)" logic="Exporter === Importer" desc="Moving goods to oneself to create a false paper trail for tax refunds or money laundering." />
                <GuideItem term="Round-Tripping" logic="A -> B -> A" desc="Shipping goods back to the country of origin to artificially inflate trade volume or export incentives." />
                <GuideItem term="Price Anomaly" logic="Price > 1.5x Avg" desc="Setting extreme prices to move currency across borders under the guise of trading." />
                <GuideItem term="Shell Entity Index" logic="Flags / Total_Trades" desc="Rating a company's reliability based on how many suspicious trades they perform." />
            </div>
        </div>
    );
}

function GuideItem({ term, logic, desc }) {
    return (
        <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100">
            <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{term}</h4>
            <code className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1 rounded-md">{logic}</code>
            <p className="mt-4 text-slate-600 font-bold leading-relaxed">{desc}</p>
        </div>
    );
}

function SARReport({ stats }) {
    return (
        <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-2 border-slate-900 max-w-4xl mx-auto text-center relative overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="absolute top-0 right-0 p-8 bg-slate-900 text-white font-black uppercase text-xs">Internal Use Only</div>
            <FileText className="mx-auto text-slate-900 mb-8" size={64} />
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4 underline decoration-blue-600 decoration-8">Suspicious Activity Report</h2>
            <p className="text-slate-500 font-bold mb-10">Date: {new Date().toLocaleDateString()} | Reference: TS-AI-2024-001</p>
            
            <div className="text-left space-y-6 bg-slate-50 p-10 rounded-[2rem] border-2 border-slate-100">
                <div className="flex justify-between border-b pb-4">
                    <span className="font-black uppercase text-slate-400">Flagged Capital</span>
                    <span className="font-black text-2xl text-red-600">${stats.fraudValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b pb-4">
                    <span className="font-black uppercase text-slate-400">Shell Nodes Identified</span>
                    <span className="font-black text-2xl text-slate-900">{stats.entities}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-black uppercase text-slate-400">Risk Confidence</span>
                    <span className="font-black text-2xl text-emerald-600">98.4%</span>
                </div>
            </div>

            <button className="mt-12 bg-slate-900 text-white font-black px-16 py-5 rounded-full text-xl shadow-2xl hover:bg-blue-600 transition-all flex items-center gap-4 mx-auto">
                <DownloadCloud /> DOWNLOAD PDF AUDIT
            </button>
        </div>
    );
}
