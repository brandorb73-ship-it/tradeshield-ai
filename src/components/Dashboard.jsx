import React, { useState, useMemo } from 'react';
import Papa from 'papaparse'; 
import { 
  AlertTriangle, ShieldCheck, Activity, Globe, Link as LinkIcon, 
  TrendingUp, Search, BarChart3, ListFilter, ShieldAlert, FileText, 
  BookOpen, Network, Zap, Percent, Scale, DownloadCloud, AlertOctagon, Layers, Calendar, MapPin, ArrowLeftRight, Info, DollarSign, Brain
} from 'lucide-react';
import "leaflet/dist/leaflet.css";
import ShipmentLedger from "./ShipmentLedger";
import NetworkGraph from "./NetworkGraph";
import RouteRiskMap from "./RouteRiskMap";

import { detectTobaccoFraud } from "../analytics/tobaccoFraudSignals";
import runFraudEngine from "../analytics/riskEngine";
import detectVATCarousel from "../analytics/vatCarousel";
import detectPhantomExporter from "../analytics/phantomExporter";
import detectPriceFraud from "../analytics/priceFraud";

export default function Dashboard() {
  const [urlInput, setUrlInput] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("audit");
  const [stats, setStats] = useState({});
const [fraudStats, setFraudStats] = useState({
  vat: [],
  phantom: [],
  price: [],
  mlScores: {}
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

    // --- LOGIC CONTAINERS ---
    const brandToHS = {};
    const entityStats = {};
    const massBalance = {}; 
    const routeIntel = {};
    const hsAgg = {}; // { [Entity|Brand|HS]: {weight, amount, count} }
    const selfAgg = {}; // { [Entity]: {weight, qty, countries: Set, amount} }
    const amountBuckets = { small: 0, medium: 0, large: 0 };
    const brandPrices = {};
    const tobaccoSignals=detectTobaccoFraud(rawData);
    let totalWeight = 0;
    let totalAmt = 0;
// NEW FRAUD DETECTIONS

const vatEntities = detectVATCarousel(rawData);
const phantomEntities = detectPhantomExporter(rawData);
const priceEntities = detectPriceFraud(rawData);

const mlScores = runFraudEngine(rawData);

setFraudStats({
  vat: vatEntities,
  phantom: phantomEntities,
  price: priceEntities,
  mlScores
});
    rawData.forEach(row => {
        const exp = row.Exporter;
        const imp = row.Importer;
        const brand = row.Brand;
        const hs = row['HS Code'];
        const amt = parseVal(row['Amount($)']);
        const weight = parseVal(row['Weight(Kg)']);
        const qty = parseVal(row['Quantity']);
        const origin = row['Origin Country'];
        const dest = row['Destination Country'];
        const unitPrice = amt / (weight || 1);

        totalWeight += weight;
        totalAmt += amt;

        // Financial Intelligence
        if (amt < 1000) amountBuckets.small++;
        else if (amt < 5000) amountBuckets.medium++;
        else amountBuckets.large++;

        // Initialize entities
        [exp, imp].filter(Boolean).forEach(e => {
            if (!entityStats[e]) entityStats[e] = { self: 0, hs: 0, price: 0, total: 0, uTurns: 0 };
        });
        entityStats[exp].total += 1;

        // HS Aggregation
        const hsKey = `${exp}|${brand}|${hs}`;
        if (!hsAgg[hsKey]) hsAgg[hsKey] = { entity: exp, brand, hs, weight: 0, amount: 0, count: 0 };
        hsAgg[hsKey].weight += weight;
        hsAgg[hsKey].amount += amt;
        hsAgg[hsKey].count++;

        // HS Mismatch Logic
        if (!brandToHS[brand]) brandToHS[brand] = hs;
        else if (brandToHS[brand] !== hs) entityStats[exp].hs += 1;

        // Self-Trade Aggregation
        if (exp === imp) {
            entityStats[exp].self += 1;
            if (!selfAgg[exp]) selfAgg[exp] = { weight: 0, qty: 0, countries: new Set(), amount: 0 };
            selfAgg[exp].weight += weight;
            selfAgg[exp].qty += qty;
            selfAgg[exp].amount += amt;
            selfAgg[exp].countries.add(origin);
            selfAgg[exp].countries.add(dest);
        }

        // Mass Balance
        if (!massBalance[exp]) massBalance[exp] = {};
        if (!massBalance[exp][brand]) massBalance[exp][brand] = { exp: 0, imp: 0 };
        massBalance[exp][brand].exp += weight;
        if (imp) {
            if (!massBalance[imp]) massBalance[imp] = {};
            if (!massBalance[imp][brand]) massBalance[imp][brand] = { exp: 0, imp: 0 };
            massBalance[imp][brand].imp += weight;
        }

        // Route Intel
        const routeKey = `${origin}->${dest}`;
        if (!routeIntel[routeKey]) routeIntel[routeKey] = { weight: 0, amount: 0, entities: new Set() };
        routeIntel[routeKey].weight += weight;
        routeIntel[routeKey].amount += amt;
        routeIntel[routeKey].entities.add(exp);

        // Price Baseline
        if (!brandPrices[brand]) brandPrices[brand] = [];
        brandPrices[brand].push(unitPrice);
    });

    const brandAvgs = {};
    Object.keys(brandPrices).forEach(b => {
        brandAvgs[b] = brandPrices[b].reduce((a, b) => a + b, 0) / brandPrices[b].length;
    });

    // U-Turn + Price Anomaly Post-Process
    rawData.forEach(r => {
        const p = parseVal(r['Amount($)']) / (parseVal(r['Weight(Kg)']) || 1);
        if (p > brandAvgs[r.Brand] * 1.3 || p < brandAvgs[r.Brand] * 0.7) {
            entityStats[r.Exporter].price += 1;
        }
    });

    // Final AI-Summary Construction
    const highRiskNode = Object.entries(entityStats).sort((a,b) => b[1].self - a[1].self)[0][0];
    const summary = `Forensic scan identifies ${highRiskNode} as the primary entity of concern due to high circularity. Total capital at risk through self-trading is $${totalAmt.toLocaleString()}. Analysis of HS codes shows ${Object.keys(hsAgg).length} aggregated shipment types, with significant mass balance parity in ${Object.keys(massBalance).length} entities, suggesting a hub-and-spoke tax evasion pattern.`;

    setData(rawData.map(r => ({
        ...r,
        _isSelf: r.Exporter === r.Importer,
        _isHS: brandToHS[r.Brand] !== r['HS Code'],
        _isPrice: (parseVal(r['Amount($)']) / (parseVal(r['Weight(Kg)']) || 1)) > brandAvgs[r.Brand] * 1.3
    })));

    setStats({
        totalWeight, totalAmt, entityStats, massBalance, routeIntel, hsAgg, selfAgg, amountBuckets, summary, brandAvgs, tobaccoSignals
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20 font-sans">
      <nav className="bg-[#020617] text-white py-6 px-8 shadow-2xl border-b-4 border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <ShieldAlert className="text-blue-500" size={40} />
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">TRADESHIELD <span className="text-blue-500 italic">PRO</span></h1>
              <div className="text-sm font-bold text-blue-300 uppercase tracking-widest">Global Forensic Dashboard</div>
            </div>
          </div>
         <div className="flex w-full md:w-2/3 gap-3">

<input
type="text"
placeholder="Paste CSV Link..."
className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-3 px-6 text-lg text-white"
value={urlInput}
onChange={(e)=>setUrlInput(e.target.value)}
/>

<button
onClick={handleFetch}
className="bg-blue-600 hover:bg-blue-500 text-white font-black px-10 py-3 rounded-2xl">
AUDIT
</button>

<button
onClick={()=>{
setUrlInput("");
setData([]);
setStats({});
setFraudStats({});
}}
className="bg-red-600 hover:bg-red-500 text-white font-black px-6 py-3 rounded-2xl">
CLEAR
</button>

</div>
        </div>
      </nav>

      {data.length > 0 && (
        <main className="max-w-7xl mx-auto p-8">
          <div className="flex flex-wrap gap-2 mb-10 bg-slate-200 p-2 rounded-3xl shadow-inner overflow-x-auto border-2 border-slate-300">
            <TabBtn active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<ListFilter size={18}/>} label="Shipment Ledger" />

<TabBtn active={activeTab === 'network'} onClick={() => setActiveTab('network')} icon={<Network size={18}/>} label="ERS Risk Score" />

<TabBtn active={activeTab === 'networkGraph'} onClick={() => setActiveTab('networkGraph')} icon={<Activity size={18}/>} label="Trade Network" />

<TabBtn active={activeTab === 'mass'} onClick={() => setActiveTab('mass')} icon={<Scale size={18}/>} label="Mass Balance" />

<TabBtn active={activeTab === 'self'} onClick={() => setActiveTab('self')} icon={<ArrowLeftRight size={18}/>} label="Self Trade Deep-Dive" />

<TabBtn active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<DollarSign size={18}/>} label="Financial Forensics" />

<TabBtn active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<Globe size={18}/>} label="Map Intel" />

<TabBtn active={activeTab === 'hs'} onClick={() => setActiveTab('hs')} icon={<Layers size={18}/>} label="HS Intel" />

<TabBtn active={activeTab === 'fraud'} onClick={() => setActiveTab('fraud')} icon={<AlertTriangle size={18}/>} label="Fraud Intel" />

<TabBtn active={activeTab === 'final'} onClick={() => setActiveTab('final')} icon={<Brain size={18}/>} label="AI Final Analysis" />

<TabBtn active={activeTab === 'guide'} onClick={() => setActiveTab('guide')} icon={<BookOpen size={18}/>} label="Audit Guide" />

          </div>

          {/* TAB: LEDGER */}
          {activeTab === "audit" && (
            <div className="animate-in fade-in space-y-6">
                <div className="bg-white rounded-[2rem] shadow-2xl border-4 border-slate-900 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white text-xs font-black uppercase">
                            <tr>
                                <th className="p-5">Risk Flag</th>
                                <th className="p-5">Date</th>
                                <th className="p-5">Entity Involved</th>
                                <th className="p-5">Brand / HS</th>
                                <th className="p-5">Route</th>
                                <th className="p-5 text-right">Weight (Kg)</th>
                                <th className="p-5 text-right">Amount ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-100 text-slate-800 font-bold">
                            {data.map((row, i) => (
                                <tr key={i} className={row._isSelf ? 'bg-red-50' : ''}>
                                    <td className="p-5">
                                        <div className="flex gap-1">
                                            {row._isSelf && <span className="bg-red-700 text-white text-[10px] px-2 py-1 rounded">SELF</span>}
                                            {row._isHS && <span className="bg-orange-600 text-white text-[10px] px-2 py-1 rounded">HS</span>}
                                            {row._isPrice && <span className="bg-purple-700 text-white text-[10px] px-2 py-1 rounded">PRICE</span>}
                                        </div>
                                    </td>
                                    <td className="p-5 text-sm">{row.Date}</td>
                                    <td className="p-5">
                                        <div className="text-base font-black uppercase">{row.Exporter}</div>
                                        <div className="text-xs text-blue-700 uppercase">To: {row.Importer}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="text-base uppercase">{row.Brand}</div>
                                        <div className="text-xs text-slate-700">HS: {row['HS Code']}</div>
                                    </td>
                                    <td className="p-5">
                                        <div className="text-xs flex items-center gap-1 uppercase"><MapPin size={12}/> {row['Origin Country']} &rarr; {row['Destination Country']}</div>
                                    </td>
                                    <td className="p-5 text-right text-base font-black">{row['Weight(Kg)']}</td>
                                    <td className="p-5 text-right text-lg font-black text-slate-900">${row['Amount($)']}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t-4 border-slate-900 font-black text-slate-900 uppercase">
                            <tr>
                                <td colSpan="5" className="p-6 text-right text-xl">Total Audit Volume:</td>
                                <td className="p-6 text-right text-2xl">{stats.totalWeight?.toFixed(2)} KG</td>
                                <td className="p-6 text-right text-3xl text-red-700">${stats.totalAmt?.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
          )}

          {/* TAB: FINAL ANALYSIS (AI SUMMARY) */}
          {activeTab === "final" && (
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-blue-600 animate-in zoom-in">
                  <div className="flex items-center gap-4 mb-8">
                      <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl"><Brain size={40}/></div>
                      <h2 className="text-4xl font-black uppercase tracking-tighter">Forensic Conclusion Summary</h2>
                  </div>
                  <div className="bg-slate-50 p-10 rounded-[2rem] border-2 border-slate-200 mb-10 text-2xl font-bold leading-relaxed text-slate-800 italic">
                      "{stats.summary}"
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <SummaryCard label="Capital Exposure" value={`$${stats.totalAmt?.toLocaleString()}`} color="red" />
                      <SummaryCard label="High Risk Nodes" value={Object.keys(stats.entityStats).length} color="blue" />
                      <SummaryCard label="Tax Anomaly Index" value="CRITICAL" color="purple" />
                  </div>
              </div>
          )}

          {/* TAB: ERS SCORING */}
          {activeTab === "network" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                {Object.entries(stats.entityStats).sort((a,b)=>b[1].total - a[1].total).map(([name, s]) => {
                    const score = ((s.self*3 + s.hs*2 + s.price*5) / (s.total || 1) * 10).toFixed(1);
                    return (
                        <div key={name} className="p-10 bg-white border-4 border-slate-900 rounded-[3rem] flex justify-between items-center shadow-xl">
                            <div>
                                <h3 className="text-2xl font-black uppercase text-slate-900 leading-tight mb-2">{name}</h3>
                                <p className="text-sm font-bold text-slate-700 uppercase">Transactions: {s.total}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-slate-700 uppercase">ERS Risk Score</div>
                                <div className={`text-6xl font-black ${score > 50 ? 'text-red-600' : 'text-emerald-600'}`}>{score}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
          )}

          {/* TAB: MASS BALANCE */}
          {activeTab === "mass" && (
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-slate-900 animate-in fade-in">
                  <h2 className="text-3xl font-black uppercase mb-10 border-b-8 border-blue-600 w-fit">In-Out Weight Reconciliation</h2>
                  <div className="space-y-6">
                    {Object.entries(stats.massBalance).map(([entity, brands]) => (
                        Object.entries(brands).map(([brand, w]) => {
                            if (w.exp > 0 && w.imp > 0) {
                                return (
                                    <div key={entity+brand} className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-200 flex justify-between items-center">
                                        <div className="text-3xl font-black uppercase text-slate-900">{entity}</div>
                                        <div className="flex gap-10">
                                            <div className="text-right">
                                                <div className="text-xs font-black text-slate-700 uppercase">Brand Flow: {brand}</div>
                                                <div className="text-xl font-bold">Imp: {w.imp.toFixed(1)}kg | Exp: {w.exp.toFixed(1)}kg</div>
                                            </div>
                                            <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-2xl">{(w.exp/w.imp*100).toFixed(0)}% MATCH</div>
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

          {/* TAB: SELF TRADE */}
          {activeTab === "self" && (
              <div className="space-y-6 animate-in fade-in">
                  {Object.entries(stats.selfAgg).map(([name, data]) => (
                      <div key={name} className="bg-white p-10 rounded-[3rem] border-4 border-red-600 shadow-2xl">
                          <div className="flex justify-between items-start mb-8">
                              <h2 className="text-4xl font-black uppercase text-slate-900">{name}</h2>
                              <span className="bg-red-600 text-white px-8 py-2 rounded-full font-black text-xl">SELF-TRADE NODE</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                              <StatBox label="Total Weight" val={`${data.weight.toFixed(1)} KG`} />
                              <StatBox label="Total Quantity" val={data.qty.toLocaleString()} />
                              <StatBox label="Countries Involved" val={data.countries.size} />
                              <StatBox label="Financial Loop" val={`$${data.amount.toLocaleString()}`} />
                          </div>
                          <div className="mt-8 flex gap-2">
                              {Array.from(data.countries).map(c => (
                                  <span key={c} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-black uppercase">{c}</span>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* TAB: FINANCIAL FORENSICS */}
          {activeTab === "finance" && (
              <div className="bg-white p-12 rounded-[3rem] shadow-xl border-4 border-slate-900 animate-in zoom-in">
                  <h2 className="text-3xl font-black uppercase mb-10">Amount Distribution Intelligence</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                      <div className="p-8 bg-emerald-50 rounded-3xl border-2 border-emerald-200 text-center">
                          <div className="text-sm font-black uppercase mb-2">Micro-Trades (&lt;$1k)</div>
                          <div className="text-5xl font-black text-emerald-700">{stats.amountBuckets.small}</div>
                      </div>
                      <div className="p-8 bg-blue-50 rounded-3xl border-2 border-blue-200 text-center">
                          <div className="text-sm font-black uppercase mb-2">Mid-Tier ($1k-5k)</div>
                          <div className="text-5xl font-black text-blue-700">{stats.amountBuckets.medium}</div>
                      </div>
                      <div className="p-8 bg-purple-50 rounded-3xl border-2 border-purple-200 text-center">
                          <div className="text-sm font-black uppercase mb-2">High-Value (&gt;$5k)</div>
                          <div className="text-5xl font-black text-purple-700">{stats.amountBuckets.large}</div>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: MAP INTEL */}
          {activeTab === "map" && (
              <div className="bg-slate-900 p-12 rounded-[4rem] text-white animate-in fade-in">
                  <h2 className="text-3xl font-black uppercase mb-10 flex items-center gap-4"><Globe className="text-blue-500"/> Trade Corridor Density</h2>
                  <div className="space-y-4">
                      {Object.entries(stats.routeIntel).map(([route, d]) => (
                          <div key={route} className="p-8 bg-slate-800 rounded-[2rem] border-2 border-slate-700 flex justify-between items-center">
                              <div>
                                  <div className="text-3xl font-black uppercase tracking-tighter text-blue-400">{route}</div>
                                  <div className="flex gap-4 mt-2">
                                      {Array.from(d.entities).map(e => <span key={e} className="text-sm font-bold bg-slate-700 px-3 py-1 rounded text-slate-300">{e}</span>)}
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-2xl font-black">${d.amount.toLocaleString()}</div>
                                  <div className="text-sm font-black text-slate-500 uppercase">{d.weight.toFixed(0)} KG TRANSACTED</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* TAB: HS INTEL (AGGREGATED) */}
          {activeTab === "hs" && (
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-slate-900 animate-in fade-in">
                  <h2 className="text-3xl font-black uppercase mb-10">Aggregated Shipment Intelligence</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.values(stats.hsAgg).map((item, i) => (
                          <div key={i} className="p-8 bg-slate-50 border-2 border-slate-200 rounded-3xl">
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <div className="text-base font-black uppercase text-slate-900">{item.entity}</div>
                                      <div className="text-xs font-black text-blue-600 uppercase">Brand: {item.brand}</div>
                                  </div>
                                  <div className="bg-slate-900 text-white px-4 py-1 rounded-lg text-xs font-black">HS: {item.hs}</div>
                              </div>
                              <div className="flex justify-between font-black text-slate-800 border-t pt-4">
                                  <span>{item.count} SHIPMENTS</span>
                                  <span className="text-blue-700">${item.amount.toLocaleString()}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

{activeTab === "fraud" && (

<div className="grid grid-cols-1 md:grid-cols-3 gap-8">

<div className="bg-white p-8 rounded-3xl border-4 border-red-600">

<h3 className="text-2xl font-black mb-4">VAT Carousel Risk</h3>

{fraudStats.vat.map(e => (
<div key={e} className="text-red-700 font-bold">{e}</div>
))}

</div>


<div className="bg-white p-8 rounded-3xl border-4 border-purple-600">

<h3 className="text-2xl font-black mb-4">Phantom Exporters</h3>

{fraudStats.phantom.map(e => (
<div key={e} className="text-purple-700 font-bold">{e}</div>
))}

</div>


<div className="bg-white p-8 rounded-3xl border-4 border-blue-600">

<h3 className="text-2xl font-black mb-4">Price Manipulation</h3>

{fraudStats.price.map(e => (
<div key={e} className="text-blue-700 font-bold">{e}</div>
))}

</div>

</div>

)}
{/* TAB: NETWORK GRAPH */}
{activeTab === "networkGraph" && (
  <div className="bg-white p-10 rounded-3xl border-4 border-slate-900 shadow-xl">
      <NetworkGraph data={data} fraudStats={fraudStats}/>
  </div>
)}
          {activeTab === "guide" && <GuideView />}

        </main>
      )}
    </div>
  );
}

// --- SHARED COMPONENTS ---

function TabBtn({ active, onClick, icon, label }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-tight transition-all shrink-0 ${active ? 'bg-slate-900 text-white shadow-xl scale-110 z-10' : 'text-slate-800 hover:text-blue-600'}`}>
            {icon} {label}
        </button>
    );
}

function SummaryCard({ label, value, color }) {
    const colors = { red: 'text-red-700', blue: 'text-blue-700', purple: 'text-purple-700' };
    return (
        <div className="p-8 bg-slate-50 rounded-3xl border-2 border-slate-200 text-center">
            <div className="text-sm font-black text-slate-700 uppercase mb-2">{label}</div>
            <div className={`text-4xl font-black ${colors[color]}`}>{value}</div>
        </div>
    );
}

function StatBox({ label, val }) {
    return (
        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
            <div className="text-xs font-black text-slate-700 uppercase mb-2">{label}</div>
            <div className="text-xl font-black text-slate-900">{val}</div>
        </div>
    );
}

function GuideView() {
    return (
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-slate-900">
            <h2 className="text-3xl font-black uppercase mb-10 border-b-8 border-blue-600 w-fit">Audit Logic Definitions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GuideItem title="ERS Score (Weighted Risk)" logic="High Score = Critical Alert" desc="Calculated by weighting suspicious events: (SelfTrade x3, HS Mismatch x2, Price Anomaly x5) / Total Transactions. Scores > 50 indicate systemic manipulation." />
                <GuideItem title="Price Anomaly Intelligence" logic="±30% Baseline Deviation" desc="Identifies potential capital flight or tax evasion. Transaction prices are compared to the brand's average unit price across the entire dataset." />
                <GuideItem title="Mass Balance Reconstruction" logic="Inward Weight vs Outward Weight" desc="Forensic tool that flags entities acting as transit hubs. High parity (e.g. 98%) suggests goods are not being consumed or processed locally." />
                <GuideItem title="Circular Trade (Self-Trade)" logic="Exporter === Importer" desc="Identifies transactions where the beneficiary and sender are the same legal entity, a classic sign of round-tripping for VAT fraud." />
            </div>
        </div>
    );
}

function GuideItem({ title, logic, desc }) {
    return (
        <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-200">
            <h4 className="text-2xl font-black text-slate-900 uppercase mb-2">{title}</h4>
            <code className="bg-blue-600 text-white px-4 py-1 rounded-md text-sm font-black mb-4 block w-fit">{logic}</code>
            <p className="text-base font-bold text-slate-800 leading-relaxed">{desc}</p>
        </div>
    );
}
