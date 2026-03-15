import React, { useState, useMemo } from 'react';
import Papa from 'papaparse'; 
import { 
  AlertTriangle, ShieldCheck, Activity, Globe, Link as LinkIcon, 
  TrendingUp, Search, BarChart3, ListFilter, ShieldAlert, FileText, 
  BookOpen, Network, Zap, Percent, Scale, DownloadCloud, AlertOctagon, Layers, Calendar, MapPin, ArrowLeftRight, Info
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, ScatterChart, Scatter, ZAxis } from 'recharts';

export default function Dashboard() {
  const [urlInput, setUrlInput] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("audit"); 
  const [stats, setStats] = useState({ 
    selfTrade: 0, totalValue: 0, entities: 0, 
    fraudValue: 0, riskIndex: 0, uTurns: 0, hsMismatches: 0,
    entityRisk: {}, brandAvgs: {}, massBalance: {}
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

    // 1. Calculations
    const brandToHS = {};
    const hsMismatchDetails = [];
    const entityStats = {};
    const massBalance = {}; 
    const pairs = {};
    const brandPrices = {};

    rawData.forEach(r => {
        const exp = r.Exporter;
        const imp = r.Importer;
        const brand = r.Brand;
        const weight = parseVal(r['Weight(Kg)']);
        const amount = parseVal(r['Amount($)']);
        const hs = r['HS Code'];
        const unitPrice = amount / (weight || 1);

        // Initialize entities
        [exp, imp].filter(Boolean).forEach(e => {
            if (!entityStats[e]) entityStats[e] = { self: 0, hs: 0, price: 0, total: 0, uTurns: 0 };
        });

        // Price Baseline
        if (!brandPrices[brand]) brandPrices[brand] = [];
        brandPrices[brand].push(unitPrice);

        // HS Logic
        if (!brandToHS[brand]) {
            brandToHS[brand] = hs;
        } else if (brandToHS[brand] !== hs) {
            entityStats[exp].hs += 1;
            hsMismatchDetails.push({ entity: exp, brand, usedHS: hs, originalHS: brandToHS[brand], amount, weight });
        }

        // Self-Trade
        if (exp === imp) {
            entityStats[exp].self += 1;
        }

        // Mass Balance (Weight Tracking)
        if (!massBalance[exp]) massBalance[exp] = {};
        if (!massBalance[exp][brand]) massBalance[exp][brand] = { exp: 0, imp: 0 };
        massBalance[exp][brand].exp += weight;

        if (imp) {
            if (!massBalance[imp]) massBalance[imp] = {};
            if (!massBalance[imp][brand]) massBalance[imp][brand] = { exp: 0, imp: 0 };
            massBalance[imp][brand].imp += weight;
        }

        // U-Turn Logic
        const key = `${exp}->${imp}`;
        pairs[key] = (pairs[key] || 0) + 1;
    });

    const brandAvgs = {};
    Object.keys(brandPrices).forEach(b => {
        brandAvgs[b] = brandPrices[b].reduce((a, b) => a + b, 0) / brandPrices[b].length;
    });

    // Check U-Turns
    let uTurnCount = 0;
    Object.keys(pairs).forEach(k => {
        const [e1, e2] = k.split('->');
        if (e1 !== e2 && pairs[`${e2}->${e1}`]) {
            uTurnCount++;
            entityStats[e1].uTurns += 1;
        }
    });

    // Price Anomaly Flagging
    rawData.forEach(r => {
        const p = parseVal(r['Amount($)']) / (parseVal(r['Weight(Kg)']) || 1);
        if (p > brandAvgs[r.Brand] * 1.3 || p < brandAvgs[r.Brand] * 0.7) {
            entityStats[r.Exporter].price += 1;
        }
    });

    setData(rawData.map(r => ({
        ...r,
        _isSelf: r.Exporter === r.Importer,
        _isHS: brandToHS[r.Brand] !== r['HS Code'],
        _isPrice: (parseVal(r['Amount($)']) / (parseVal(r['Weight(Kg)']) || 1)) > brandAvgs[r.Brand] * 1.3
    })));

    setStats({
        selfTrade: rawData.filter(r => r.Exporter === r.Importer).length,
        totalValue: rawData.reduce((acc, r) => acc + parseVal(r['Amount($)']), 0),
        fraudValue: rawData.filter(r => r.Exporter === r.Importer).reduce((acc, r) => acc + parseVal(r['Amount($)']), 0),
        entities: Object.keys(entityStats).length,
        uTurns: Math.floor(uTurnCount/2),
        hsMismatches: hsMismatchDetails.length,
        hsDetails: hsMismatchDetails,
        entityRisk: entityStats,
        brandAvgs: brandAvgs,
        massBalance: massBalance
    });
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 pb-20 font-sans">
      {/* NAV */}
      <nav className="bg-[#020617] text-white py-6 px-8 shadow-2xl border-b-4 border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <ShieldAlert className="text-blue-500" size={40} />
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">TRADESHIELD <span className="text-blue-500">PRO AI</span></h1>
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">Compliance & Forensic Division</div>
            </div>
          </div>
          <div className="flex w-full md:w-2/3 gap-3">
            <input 
              type="text" 
              placeholder="Source Audit URL..." 
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-3 px-6 text-lg text-white outline-none focus:ring-4 focus:ring-blue-500/50"
              value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
            />
            <button onClick={handleFetch} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 py-3 rounded-2xl text-lg transition-all">
              {loading ? "SCANNING..." : "AUDIT"}
            </button>
          </div>
        </div>
      </nav>

      {data.length > 0 && (
        <main className="max-w-7xl mx-auto p-8">
          
          <div className="flex flex-wrap gap-2 mb-10 bg-slate-300/50 p-2 rounded-3xl shadow-inner overflow-x-auto">
            <TabBtn active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<ListFilter size={18}/>} label="Ledger" />
            <TabBtn active={activeTab === 'network'} onClick={() => setActiveTab('network')} icon={<Network size={18}/>} label="ERS Risk" />
            <TabBtn active={activeTab === 'mass'} onClick={() => setActiveTab('mass')} icon={<Scale size={18}/>} label="Mass Balance" />
            <TabBtn active={activeTab === 'loops'} onClick={() => setActiveTab('loops')} icon={<ArrowLeftRight size={18}/>} label="U-Turns/Self" />
            <TabBtn active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<Globe size={18}/>} label="Map Intel" />
            <TabBtn active={activeTab === 'hs'} onClick={() => setActiveTab('hs')} icon={<Layers size={18}/>} label="HS Intel" />
            <TabBtn active={activeTab === 'guide'} onClick={() => setActiveTab('guide')} icon={<BookOpen size={18}/>} label="Guide" />
          </div>

          {/* TAB 1: LEDGER */}
          {activeTab === "audit" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="bg-blue-600 p-4 rounded-2xl text-white flex items-center gap-3 font-bold text-sm shadow-lg">
                <Info size={20}/>
                <span><b className="uppercase">Price Anomaly Logic:</b> Transactions are flagged if the Unit Price deviates by more than 30% from the brand's global average in this dataset.</span>
              </div>
              <TableLog data={data} />
            </div>
          )}

          {/* TAB 2: ERS SCORING */}
          {activeTab === "network" && (
            <div className="space-y-8 animate-in fade-in">
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-200">
                    <h2 className="text-3xl font-black uppercase mb-4">Entity Risk Scoring (ERS)</h2>
                    <p className="text-slate-500 font-bold mb-8">
                        The <span className="text-red-600">higher the ERS score, the higher the forensic risk</span>. A score above 50 indicates a potential shell entity or systematic fraud involvement.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(stats.entityRisk).sort((a,b) => {
                             const scoreB = ((b[1].self*3 + b[1].hs*2 + b[1].price*5 + b[1].uTurns*4) / (b[1].total || 1));
                             const scoreA = ((a[1].self*3 + a[1].hs*2 + a[1].price*5 + a[1].uTurns*4) / (a[1].total || 1));
                             return scoreB - scoreA;
                        }).map(([name, s]) => (
                            <ERSCard key={name} name={name} s={s} />
                        ))}
                    </div>
                </div>
            </div>
          )}

          {/* TAB 3: MASS BALANCE */}
          {activeTab === "mass" && (
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200 animate-in zoom-in">
                  <h2 className="text-3xl font-black uppercase mb-6 flex items-center gap-4"><Scale className="text-blue-600"/> Mass Balance Intelligence</h2>
                  <p className="text-slate-500 font-bold mb-10">Comparing total Export Weight vs Import Weight per Brand. Near 100% parity suggests the entity is a "Transit Node" or performing "Round-Tripping".</p>
                  <div className="space-y-4">
                    {Object.entries(stats.massBalance).map(([entity, brands]) => (
                        Object.entries(brands).map(([brand, weights]) => {
                            if (weights.exp > 0 && weights.imp > 0) {
                                const variance = Math.abs((weights.exp - weights.imp) / weights.exp * 100).toFixed(1);
                                return (
                                    <div key={entity+brand} className="p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] flex justify-between items-center">
                                        <div>
                                            <div className="text-[10px] font-black text-blue-500 uppercase">Entity: {entity}</div>
                                            <div className="text-2xl font-black uppercase text-slate-800">{brand}</div>
                                        </div>
                                        <div className="flex gap-12 text-right">
                                            <div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase">Imported</div>
                                                <div className="text-xl font-black text-slate-900">{weights.imp.toFixed(1)} KG</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase">Exported</div>
                                                <div className="text-xl font-black text-slate-900">{weights.exp.toFixed(1)} KG</div>
                                            </div>
                                            <div className="bg-red-600 text-white px-6 py-3 rounded-2xl">
                                                <div className="text-[9px] font-black uppercase">Variance</div>
                                                <div className="text-xl font-black">{variance}%</div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                            return null;
                        })
                    ))}
                  </div>
              </div>
          )}

          {/* TAB 4: U-TURNS & SELF TRADE */}
          {activeTab === "loops" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                  <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-200">
                      <h3 className="text-2xl font-black uppercase mb-6 text-red-600">Self-Trade Analysis</h3>
                      <div className="space-y-4">
                          {Object.entries(stats.entityRisk).filter(e => e[1].self > 0).map(([name, s]) => (
                              <div key={name} className="p-6 bg-red-50 rounded-2xl flex justify-between items-center border border-red-100">
                                  <span className="font-black uppercase">{name}</span>
                                  <span className="bg-red-600 text-white px-4 py-1 rounded-full text-xs font-black">{s.self} TRADES</span>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-200">
                      <h3 className="text-2xl font-black uppercase mb-6 text-blue-600">U-Turn (Ping-Pong) Detection</h3>
                      <div className="space-y-4">
                        {stats.uTurns > 0 ? (
                            <div className="text-center py-20">
                                <ArrowLeftRight size={64} className="mx-auto text-blue-200 mb-4" />
                                <div className="text-4xl font-black text-slate-900">{stats.uTurns} Loops</div>
                                <div className="text-sm font-bold text-slate-400 uppercase">Verified Bilateral Flows</div>
                            </div>
                        ) : <div className="text-slate-300 font-black text-center py-20 uppercase">No Loops Found</div>}
                      </div>
                  </div>
              </div>
          )}

          {/* TAB 5: MAP INTEL */}
          {activeTab === "map" && (
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200 animate-in slide-in-from-bottom-10">
                  <h2 className="text-3xl font-black uppercase mb-8 flex items-center gap-3"><Globe className="text-emerald-500"/> Trade Corridor Intelligence</h2>
                  <div className="grid grid-cols-1 gap-6">
                      {data.filter((v,i,a)=>a.findIndex(t=>(t['Origin Country'] === v['Origin Country'] && t['Destination Country']===v['Destination Country']))===i).map((route, i) => (
                          <div key={i} className="p-8 bg-slate-900 text-white rounded-[2rem] flex justify-between items-center">
                              <div className="flex items-center gap-8">
                                  <div className="text-center">
                                      <div className="text-[10px] font-black text-emerald-400 uppercase">Origin</div>
                                      <div className="text-xl font-black uppercase">{route['Origin Country']}</div>
                                  </div>
                                  <div className="h-0.5 w-20 bg-emerald-500 relative">
                                      <div className="absolute -top-2 right-0 w-4 h-4 bg-emerald-500 rounded-full"></div>
                                  </div>
                                  <div className="text-center">
                                      <div className="text-[10px] font-black text-blue-400 uppercase">Destination</div>
                                      <div className="text-xl font-black uppercase">{route['Destination Country']}</div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-[10px] font-black text-slate-500 uppercase">Primary Entity</div>
                                  <div className="text-sm font-bold text-blue-400 uppercase">{route.Exporter}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* TAB 6: HS INTEL (ENHANCED) */}
          {activeTab === "hs" && (
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200 animate-in fade-in">
                  <h2 className="text-3xl font-black uppercase mb-10 flex items-center gap-3"><Layers className="text-orange-500"/> HS Misclassification Intelligence</h2>
                  <div className="space-y-6">
                      {stats.hsDetails.length > 0 ? stats.hsDetails.map((item, i) => (
                          <div key={i} className="p-8 bg-orange-50 border-2 border-orange-100 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                              <div>
                                  <div className="text-[10px] font-black text-orange-600 uppercase">Entity Involved</div>
                                  <div className="text-xl font-black text-slate-900 uppercase">{item.entity}</div>
                                  <div className="text-sm font-bold text-slate-400 uppercase mt-1">Brand: {item.brand}</div>
                              </div>
                              <div className="flex justify-center gap-4">
                                  <div className="text-center">
                                      <div className="text-[9px] font-black text-slate-400 uppercase">Original HS</div>
                                      <div className="bg-white border-2 border-slate-200 px-4 py-2 rounded-xl font-black">{item.originalHS}</div>
                                  </div>
                                  <div className="text-center">
                                      <div className="text-[9px] font-black text-red-500 uppercase">Used HS</div>
                                      <div className="bg-red-600 text-white px-4 py-2 rounded-xl font-black shadow-lg">{item.usedHS}</div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-[10px] font-black text-slate-400 uppercase">Financial Impact</div>
                                  <div className="text-3xl font-black text-slate-900 tracking-tighter">${item.amount.toLocaleString()}</div>
                                  <div className="text-[10px] font-black text-blue-500 uppercase">{item.weight} KG</div>
                              </div>
                          </div>
                      )) : <div className="text-center py-20 text-slate-300 font-black text-2xl uppercase">All HS Codes Compliant</div>}
                  </div>
              </div>
          )}

          {activeTab === "guide" && <GuideView />}

        </main>
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---

function ERSCard({ name, s }) {
    const score = ((s.self*3 + s.hs*2 + s.price*5 + s.uTurns*4) / (s.total || 1) * 10).toFixed(1);
    const isCritical = score > 50;
    return (
        <div className={`p-8 bg-white rounded-[2.5rem] border-2 transition-all ${isCritical ? 'border-red-600 shadow-red-100 shadow-2xl' : 'border-slate-100 shadow-xl'}`}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h4 className="text-xl font-black uppercase text-slate-900 leading-none">{name}</h4>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 block">{s.total} TOTAL TRANSACTIONS</span>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black text-slate-400 uppercase">Risk Level</div>
                    <div className={`text-5xl font-black ${isCritical ? 'text-red-600' : 'text-emerald-500'}`}>{score}</div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-6 border-t border-slate-50">
                <MiniFlag label="Self" val={s.self} color="red" />
                <MiniFlag label="HS" val={s.hs} color="orange" />
                <MiniFlag label="Price" val={s.price} color="purple" />
                <MiniFlag label="Loop" val={s.uTurns} color="blue" />
            </div>
        </div>
    );
}

function MiniFlag({ label, val, color }) {
    const colors = { red: 'text-red-600', orange: 'text-orange-500', purple: 'text-purple-600', blue: 'text-blue-500' };
    return (
        <div className="text-center">
            <div className="text-[8px] font-black text-slate-400 uppercase">{label}</div>
            <div className={`text-sm font-black ${colors[color]}`}>{val}</div>
        </div>
    );
}

function TableLog({ data }) {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-[#0f172a] text-white text-[10px] font-black uppercase">
                    <tr>
                        <th className="p-6">Forensic Flags</th>
                        <th className="p-6">Trade Route / Date</th>
                        <th className="p-6">Entity Identity</th>
                        <th className="p-6 text-right">Value / Weight</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((row, i) => (
                        <tr key={i} className={`${row._isSelf ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                            <td className="p-6">
                                <div className="flex flex-wrap gap-1">
                                    {row._isSelf && <span className="bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-md">SELF</span>}
                                    {row._isHS && <span className="bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-md">HS</span>}
                                    {row._isPrice && <span className="bg-purple-600 text-white text-[8px] font-black px-2 py-1 rounded-md">PRICE</span>}
                                </div>
                            </td>
                            <td className="p-6">
                                <div className="text-[10px] font-black text-slate-400 uppercase">{row.Date}</div>
                                <div className="text-xs font-bold text-slate-800 uppercase mt-1 flex items-center gap-1">
                                    <MapPin size={10} className="text-blue-500"/> {row['Origin Country']} &rarr; {row['Destination Country']}
                                </div>
                            </td>
                            <td className="p-6">
                                <div className="text-lg font-black uppercase text-slate-900">{row.Exporter}</div>
                                <div className="text-[9px] font-bold text-blue-500 uppercase mt-1">To: {row.Importer}</div>
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
    );
}

function TabBtn({ active, onClick, icon, label }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-tight transition-all shrink-0 ${active ? 'bg-[#020617] text-white shadow-xl scale-110 z-10' : 'text-slate-500 hover:text-slate-900'}`}>
            {icon} {label}
        </button>
    );
}

function GuideView() {
    return (
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200">
            <h2 className="text-3xl font-black uppercase mb-10 text-slate-900 border-b-8 border-blue-600 w-fit">Audit Dictionary & Forensic Logic</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GuideItem title="ERS Score (Entity Risk)" logic="Higher is Worse" desc="Calculated by weighting suspicious events. 0-20 (Clean), 21-50 (Watchlist), 50+ (Critical Risk/Shell Alert)." />
                <GuideItem title="Price Anomaly" logic="±30% Brand Deviation" desc="Identifies potential capital flight (over-invoicing) or tax evasion (under-invoicing) compared to market brand price." />
                <GuideItem title="Mass Balance Tracking" logic="Export vs Import Weight" desc="If an entity exports nearly 100% of what it imports for a specific brand, it is likely a pass-through node for circular trade." />
                <GuideItem title="HS Code Mismatch" logic="Brand-HS Conflict" desc="Flags when a single product brand uses multiple tariff codes, indicating an attempt to hide trade volume or exploit lower duties." />
            </div>
        </div>
    );
}

function GuideItem({ title, logic, desc }) {
    return (
        <div className="p-8 bg-slate-50 rounded-3xl border-2 border-slate-100 hover:border-blue-400 transition-all">
            <h4 className="text-2xl font-black text-slate-900 uppercase mb-2">{title}</h4>
            <code className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1 rounded-md mb-4 block w-fit">{logic}</code>
            <p className="text-sm font-bold text-slate-600 leading-relaxed">{desc}</p>
        </div>
    );
}
