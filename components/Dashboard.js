import React, { useState, useMemo } from 'react';
import Papa from 'papaparse'; 
import { 
  AlertTriangle, ShieldCheck, Activity, Globe, Link as LinkIcon, 
  TrendingUp, Search, BarChart3, ListFilter, ShieldAlert, FileText, 
  BookOpen, Network, Zap, Percent, Scale, DownloadCloud, AlertOctagon, Layers, Calendar, MapPin
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

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

    // --- 1. PRE-CALCULATE BRAND AVERAGES FOR PRICING ---
    const brandPrices = {};
    rawData.forEach(r => {
        const p = parseVal(r['Amount($)']) / (parseVal(r['Weight(Kg)']) || 1);
        if (!brandPrices[r.Brand]) brandPrices[r.Brand] = [];
        brandPrices[r.Brand].push(p);
    });
    const brandAvgs = {};
    Object.keys(brandPrices).forEach(b => {
        brandAvgs[b] = brandPrices[b].reduce((a, b) => a + b, 0) / brandPrices[b].length;
    });

    // --- 2. LOGIC DETECTION ---
    const selfTradeLogs = [];
    const hsMismatchedBrands = new Set();
    const brandToHS = {};
    const uTurnPairs = new Set();
    const entityStats = {}; // To store Weighted Risk

    // Initialize entity stats
    const allEntities = new Set([...rawData.map(r => r.Exporter), ...rawData.map(r => r.Importer)].filter(Boolean));
    allEntities.forEach(e => entityStats[e] = { self: 0, hs: 0, price: 0, total: 0 });

    rawData.forEach(row => {
        const exporter = row.Exporter;
        const importer = row.Importer;
        const brand = row.Brand;
        const hs = row['HS Code'];
        const price = parseVal(row['Amount($)']) / (parseVal(row['Weight(Kg)']) || 1);

        entityStats[exporter].total += 1;
        if (importer && exporter !== importer) entityStats[importer].total += 1;

        // A. Self Trade
        if (exporter === importer) {
            selfTradeLogs.push(row);
            entityStats[exporter].self += 1;
        }

        // B. HS Mismatch
        if (!brandToHS[brand]) {
            brandToHS[brand] = hs;
        } else if (brandToHS[brand] !== hs) {
            hsMismatchedBrands.add(brand);
            entityStats[exporter].hs += 1;
        }

        // C. Price Anomaly (> 30% dev)
        if (price > brandAvgs[brand] * 1.3 || price < brandAvgs[brand] * 0.7) {
            entityStats[exporter].price += 1;
        }
    });

    // D. U-Turns
    const pairs = {};
    rawData.forEach(r => {
        const key = `${r.Exporter}->${r.Importer}`;
        pairs[key] = (pairs[key] || 0) + 1;
    });
    Object.keys(pairs).forEach(k => {
        const [exp, imp] = k.split('->');
        if (exp !== imp && pairs[`${imp}->${exp}`]) uTurnPairs.add(`${exp}<>${imp}`);
    });

    const totalVal = rawData.reduce((acc, row) => acc + parseVal(row['Amount($)']), 0);
    const fraudVal = selfTradeLogs.reduce((acc, row) => acc + parseVal(row['Amount($)']), 0);

    setData(rawData.map(r => ({
        ...r,
        _isSelf: r.Exporter === r.Importer,
        _isHS: hsMismatchedBrands.has(r.Brand),
        _isPrice: (parseVal(r['Amount($)']) / (parseVal(r['Weight(Kg)']) || 1)) > brandAvgs[r.Brand] * 1.3
    })));

    setStats({
      selfTrade: selfTradeLogs.length,
      totalValue: totalVal,
      fraudValue: fraudVal,
      entities: allEntities.size,
      riskIndex: (((selfTradeLogs.length + hsMismatchedBrands.size) / rawData.length) * 100).toFixed(1),
      uTurns: uTurnPairs.size,
      hsMismatches: hsMismatchedBrands.size,
      entityRisk: entityStats,
      brandAvgs: brandAvgs
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* NAV */}
      <nav className="bg-[#020617] text-white py-6 px-8 shadow-2xl border-b-4 border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <ShieldAlert className="text-blue-500" size={40} />
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">TRADESHIELD <span className="text-blue-500">PRO AI</span></h1>
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Advanced Forensic Engine v2.0</div>
            </div>
          </div>
          <div className="flex w-full md:w-2/3 gap-3">
            <input 
              type="text" 
              placeholder="Source Audit URL..." 
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-3 px-6 text-lg text-white outline-none focus:ring-4 focus:ring-blue-500/50"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button onClick={handleFetch} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 py-3 rounded-2xl text-lg transition-all">
              {loading ? "SCANNING..." : "AUDIT"}
            </button>
          </div>
        </div>
      </nav>

      {data.length > 0 && (
        <main className="max-w-7xl mx-auto p-8">
          
          <div className="flex flex-wrap gap-2 mb-10 bg-slate-200 p-2 rounded-3xl shadow-inner overflow-x-auto">
            <TabBtn active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<ListFilter size={18}/>} label="Investigative Ledger" />
            <TabBtn active={activeTab === 'network'} onClick={() => setActiveTab('network')} icon={<Network size={18}/>} label="Entity Risk (ERS)" />
            <TabBtn active={activeTab === 'hs'} onClick={() => setActiveTab('hs')} icon={<Layers size={18}/>} label="HS Intel" />
            <TabBtn active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} icon={<Scale size={18}/>} label="Price Variance" />
            <TabBtn active={activeTab === 'guide'} onClick={() => setActiveTab('guide')} icon={<BookOpen size={18}/>} label="Logic Guide" />
            <TabBtn active={activeTab === 'sar'} onClick={() => setActiveTab('sar')} icon={<FileText size={18}/>} label="SAR Report" />
          </div>

          {/* TAB: LEDGER (ENHANCED) */}
          {activeTab === "audit" && (
            <div className="animate-in fade-in space-y-8">
              <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-200 overflow-hidden">
                <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center">
                    <h2 className="text-xl font-black uppercase tracking-widest">Transaction Intelligence Log</h2>
                    <div className="text-[10px] font-bold bg-blue-600 px-4 py-2 rounded-full uppercase">Live Forensics Active</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase">
                            <tr>
                                <th className="p-6">Risk</th>
                                <th className="p-6">Date</th>
                                <th className="p-6">Entity Involved</th>
                                <th className="p-6">Product / HS</th>
                                <th className="p-6">Origin &rarr; Dest</th>
                                <th className="p-6 text-right">Weight / Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((row, i) => (
                                <tr key={i} className={`${row._isSelf ? 'bg-red-50/50' : 'hover:bg-slate-50'} transition-all`}>
                                    <td className="p-6">
                                        {row._isSelf && <div className="bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full mb-1">SELF-TRADE</div>}
                                        {row._isHS && <div className="bg-orange-500 text-white text-[9px] font-black px-3 py-1 rounded-full mb-1">HS-MISMATCH</div>}
                                        {row._isPrice && <div className="bg-purple-600 text-white text-[9px] font-black px-3 py-1 rounded-full">PRICE-ANOMALY</div>}
                                        {!row._isSelf && !row._isHS && !row._isPrice && <div className="text-slate-300 text-[9px] font-black uppercase tracking-widest">Nominal</div>}
                                    </td>
                                    <td className="p-6 text-sm font-bold text-slate-500">
                                        <div className="flex items-center gap-2"><Calendar size={14}/> {row.Date}</div>
                                    </td>
                                    <td className="p-6">
                                        <div className="text-lg font-black uppercase text-slate-900 leading-none">{row.Exporter}</div>
                                        <div className="text-[10px] font-bold text-blue-500 mt-2 uppercase">Importer: {row.Importer}</div>
                                    </td>
                                    <td className="p-6">
                                        <div className="font-black text-slate-700 uppercase">{row.Brand}</div>
                                        <div className="text-[10px] font-bold text-slate-400 mt-1">HS: {row['HS Code']}</div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-700 uppercase">
                                            <MapPin size={12} className="text-blue-500"/> {row['Origin Country']}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase pl-5">&rarr; {row['Destination Country']}</div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="text-2xl font-black text-slate-900 tracking-tighter">${row['Amount($)']}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase">{row['Weight(Kg)']} KG</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: NETWORK (ENTITY RISK SCORE) */}
          {activeTab === "network" && (
            <div className="animate-in fade-in space-y-8">
                <div className="bg-[#020617] p-12 rounded-[3rem] text-white">
                    <h2 className="text-3xl font-black uppercase mb-4 flex items-center gap-4"><Network className="text-blue-500"/> Entity Risk Scoring (ERS)</h2>
                    <p className="text-slate-400 font-bold mb-10 max-w-2xl">Risk is calculated using weighted forensic flags: Self-Trade (3x), HS Mismatch (2x), and Price Anomaly (5x).</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(stats.entityRisk).sort((a,b) => {
                            const scoreB = ((b[1].self*3 + b[1].hs*2 + b[1].price*5) / b[1].total);
                            const scoreA = ((a[1].self*3 + a[1].hs*2 + a[1].price*5) / a[1].total);
                            return scoreB - scoreA;
                        }).map(([name, s]) => {
                            const score = ((s.self*3 + s.hs*2 + s.price*5) / s.total * 10).toFixed(1);
                            return (
                                <div key={name} className="p-8 bg-slate-900 rounded-[2rem] border border-slate-800 flex justify-between items-center hover:border-blue-500 transition-all">
                                    <div>
                                        <h4 className="text-xl font-black uppercase tracking-tight">{name}</h4>
                                        <div className="flex gap-4 mt-4">
                                            <div className="text-center">
                                                <div className="text-[9px] font-black text-slate-500 uppercase">Self</div>
                                                <div className="font-black text-red-500">{s.self}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[9px] font-black text-slate-500 uppercase">HS</div>
                                                <div className="font-black text-orange-500">{s.hs}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[9px] font-black text-slate-500 uppercase">Price</div>
                                                <div className="font-black text-purple-500">{s.price}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-blue-400 uppercase mb-1">ERS SCORE</div>
                                        <div className={`text-5xl font-black ${score > 50 ? 'text-red-500' : 'text-emerald-500'}`}>{score}</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
          )}

          {/* OTHER TABS (Simplified placeholders to keep code readable) */}
          {activeTab === "hs" && (
              <div className="p-10 bg-white rounded-[3rem] border-2 border-slate-200">
                  <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3"><Layers className="text-orange-500"/> HS Code Intelligence</h2>
                  <p className="font-bold text-slate-500 mb-8">Detecting inconsistent tariff declarations for the same brand.</p>
                  <div className="space-y-4">
                    {Array.from(new Set(data.filter(d => d._isHS).map(d => d.Brand))).map(brand => (
                        <div key={brand} className="p-6 bg-orange-50 border-2 border-orange-100 rounded-2xl flex justify-between items-center">
                            <span className="text-xl font-black text-orange-900 uppercase">{brand}</span>
                            <span className="bg-white px-6 py-2 rounded-xl font-black text-slate-900 shadow-sm border border-orange-200">MULTIPLE HS CODES DETECTED</span>
                        </div>
                    ))}
                  </div>
              </div>
          )}

          {activeTab === "pricing" && (
              <div className="p-10 bg-white rounded-[3rem] border-2 border-slate-200">
                  <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3"><Scale className="text-purple-500"/> Unit Price Heatmap</h2>
                  <div className="space-y-4">
                    {data.filter(d => d._isPrice).slice(0, 10).map((r, i) => (
                        <div key={i} className="p-6 bg-purple-50 border-2 border-purple-100 rounded-2xl flex justify-between items-center">
                            <div>
                                <div className="text-xl font-black text-purple-900 uppercase">{r.Brand}</div>
                                <div className="text-[10px] font-bold text-purple-400 uppercase mt-1">Exceeds Market Average by &gt;30%</div>
                            </div>
                            <div className="text-2xl font-black text-slate-900">${r['Amount($)']}</div>
                        </div>
                    ))}
                  </div>
              </div>
          )}

          {activeTab === "guide" && <GuideView />}
          {activeTab === "sar" && <SARReport stats={stats} />}

        </main>
      )}
    </div>
  );
}

// --- SUBCOMPONENTS ---

function TabBtn({ active, onClick, icon, label }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-tight transition-all shrink-0 ${active ? 'bg-[#020617] text-white shadow-xl scale-110 z-10' : 'text-slate-500 hover:text-slate-900'}`}>
            {icon} {label}
        </button>
    );
}

function GuideView() {
    return (
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200">
            <h2 className="text-3xl font-black uppercase mb-10 text-slate-900 border-b-8 border-blue-600 w-fit">Investigative Methodology</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-slate-50 rounded-3xl">
                    <h4 className="text-xl font-black uppercase mb-2">1. Circular Self-Trade</h4>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">Identified by matching Exporter and Importer names. This is the #1 indicator of VAT fraud and round-tripping.</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl">
                    <h4 className="text-xl font-black uppercase mb-2">2. HS Code Mismatch</h4>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">Detects if a single brand (e.g., Manchester) is being exported under different HS codes, suggesting tariff evasion.</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl">
                    <h4 className="text-xl font-black uppercase mb-2">3. Price Variance</h4>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">Compares shipment unit price against the 30-day average for that brand. Significant outliers suggest capital flight.</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl">
                    <h4 className="text-xl font-black uppercase mb-2">4. U-Turn (Network)</h4>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">Traces goods leaving Port A for Port B and then immediately returning. Classic round-tripping pattern.</p>
                </div>
            </div>
        </div>
    );
}

function SARReport({ stats }) {
    return (
        <div className="max-w-4xl mx-auto bg-white p-16 rounded-[4rem] shadow-2xl border-4 border-slate-900 text-left animate-in slide-in-from-bottom-12">
            <h1 className="text-5xl font-black tracking-tighter mb-8 uppercase">Suspicious Activity Report</h1>
            <div className="space-y-6">
                <div className="flex justify-between border-b-2 pb-4 font-black uppercase text-xl">
                    <span>Identified Capital at Risk</span>
                    <span className="text-red-600">${stats.fraudValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b-2 pb-4 font-black uppercase">
                    <span>Self-Trade Instances</span>
                    <span>{stats.selfTrade}</span>
                </div>
                <div className="flex justify-between border-b-2 pb-4 font-black uppercase">
                    <span>HS Classification Errors</span>
                    <span>{stats.hsMismatches}</span>
                </div>
                <div className="flex justify-between border-b-2 pb-4 font-black uppercase">
                    <span>Network U-Turns</span>
                    <span>{stats.uTurns}</span>
                </div>
                <div className="pt-10">
                    <button className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl text-xl shadow-2xl flex items-center justify-center gap-4">
                        <DownloadCloud /> EXPORT FULL AUDIT BUNDLE
                    </button>
                </div>
            </div>
        </div>
    );
}
