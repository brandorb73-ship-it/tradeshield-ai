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
import {calculateFraudProbability} from "../analytics/fraudProbability";
import { financialAnalysis } from "../analytics/financialForensics";
import detectUTurnTrade from "../analytics/uTurnTrade";
import FraudIntelligenceCard from "./FraudIntelligenceCard";
import runIntelEngine from "../analytics/intelEngine";
import { detectFraudRings } from "../analytics/fraudRings";
import detectShellCompanies from "../analytics/shellDetector";  
import { calculateShellScore } from "../analytics/shellProbability";
import { detectTradeCorridors } from "../analytics/corridorHeatmap";
import mlScore from "../analytics/mlAnomaly"; 
import detectInvoiceMismatch from "../analytics/invoiceCheck"; 
import generateNarrative from "../analytics/aiNarrative";

export default function Dashboard() {
  const [urlInput, setUrlInput] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("audit");
const [activeFilter, setActiveFilter] = useState("all");
  const [stats, setStats] = useState({});
  const [intel, setIntel] = useState({});
  const [selectedEntity, setSelectedEntity] = useState(null);
const entityERS = useMemo(() => {
  if (!stats.entityStats) return [];
  return Object.entries(stats.entityStats).map(([name, s]) => {
    const raw =
  (s.self * 25) +
  (s.hs * 15) +
  (s.price * 25) +
  (s.mlRisk * 20) +
  (s.shellRisk * 30) +
  (s.ringScore * 40) +
  (s.cycleScore * 35);
    const final = Math.min(100, (raw / s.total) + (s.total > 10 ? 10 : 0));
    return { name, ...s, finalScore: final.toFixed(1) };
  }).sort((a, b) => b.finalScore - a.finalScore);
}, [stats]);
const shellScores = {};
const [fraudStats, setFraudStats] = useState({
  vat: [],
  phantom: [],
  price: [],
  mlScores: {}
});

  const filteredData = useMemo(() => {
    if (activeFilter === "all") return data;
    return data.filter(d => {
      if (activeFilter === "self") return d._isSelf;
      if (activeFilter === "hs") return d._isHS;
      if (activeFilter === "price") return d._isPrice;
      return true;
    });
  }, [data, activeFilter]);

  const visibleTotals = useMemo(() => {
    return filteredData.reduce((acc, row) => {
      acc.weight += parseFloat(row["Weight(Kg)"] || 0);
      acc.amount += parseFloat(row["Amount($)"] || 0);
      return acc;
    }, { weight: 0, amount: 0 });
  }, [filteredData]);
const fin = useMemo(() => {
  return financialAnalysis(data);
}, [data]);
 const narrative = useMemo(() => {
  return generateNarrative(stats, fraudStats);
}, [stats, fraudStats]);
  
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
  const parseVal = (v) => {
    if (!v) return 0;
    const n = parseFloat(v.toString().replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  // 1️⃣ Preprocess & normalize
  const cleanedData = rawData.map(r => {
    const row = {};
    Object.keys(r).forEach(k => {
      const key = k.trim();
      row[key] = typeof r[k] === "string" ? r[k].trim() : r[k];
    });
    const weight = parseVal(row["Weight(Kg)"]);
    const amount = parseVal(row["Amount($)"]);
    const declaredPrice = parseVal(row["Unit Price($)"]);
    const effPrice = declaredPrice > 0 ? declaredPrice : (weight > 0 ? amount / weight : 0);
    return {
      Exporter: row["Exporter"] || "UNKNOWN",
      Importer: row["Importer"] || "UNKNOWN",
      Brand: row["Brand"] || "UNKNOWN",
      "HS Code": row["HS Code"] || "UNKNOWN",
      "Amount($)": amount,
      "Weight(Kg)": weight,
      "Quantity": parseVal(row["Quantity"]),
      _declaredPrice: declaredPrice,
      _effectivePrice: effPrice,
      "Origin Country": row["Origin Country"] || "UNKNOWN",
      "Destination Country": row["Destination Country"] || "UNKNOWN",
      Date: row["Date"] || "",
      // temp flags
      _isSelf: row["Exporter"] === row["Importer"]
    };
  });

  // 2️⃣ Initialize aggregates
  const entityStats = {};
  const hsAgg = {};
  const massBalance = {};
  const selfAgg = {};
  const routeIntel = {};
  const brandPrices = {};
  const brandToHS = {};
  const amountBuckets = { small: 0, medium: 0, large: 0 };
  let totalWeight = 0;
  let totalAmt = 0;

  // 3️⃣ Single pass for all stats
  cleanedData.forEach(r => {
    const { Exporter: exp, Importer: imp, Brand: brand, "HS Code": hs, "Amount($)": amt, "Weight(Kg)": weight, Quantity: qty, "Origin Country": origin, "Destination Country": dest, _effectivePrice: unitPrice } = r;

    totalWeight += weight;
    totalAmt += amt;

    // Financial bucket
    if (amt < 1000) amountBuckets.small++;
    else if (amt < 5000) amountBuckets.medium++;
    else amountBuckets.large++;

    // Initialize entity stats
    [exp, imp].forEach(e => {
      if (!entityStats[e]) entityStats[e] = { self: 0, hs: 0, price: 0, total: 0, transactions: 0, priceAnomaly: 0, mlRisk: 0, shellRisk: 0, ringScore: 0, cycleScore: 0, uTurns: 0 };
    });
    entityStats[exp].total += 1;
    entityStats[exp].transactions += 1;

    // HS aggregation
    const hsKey = `${exp}|${brand}|${hs}`;
    if (!hsAgg[hsKey]) hsAgg[hsKey] = { entity: exp, brand, hs, weight: 0, amount: 0, count: 0 };
    hsAgg[hsKey].weight += weight;
    hsAgg[hsKey].amount += amt;
    hsAgg[hsKey].count++;

    // HS mismatch
    if (!brandToHS[brand]) brandToHS[brand] = hs;
    else if (brandToHS[brand] !== hs) entityStats[exp].hs += 1;

    // Self-trade
    if (exp === imp) {
      entityStats[exp].self += 1;
      if (!selfAgg[exp]) selfAgg[exp] = { weight: 0, qty: 0, countries: new Set(), amount: 0 };
      selfAgg[exp].weight += weight;
      selfAgg[exp].qty += qty;
      selfAgg[exp].amount += amt;
      selfAgg[exp].countries.add(origin);
      selfAgg[exp].countries.add(dest);
      r._isSelf = true;
    }

    // Mass balance
    if (!massBalance[exp]) massBalance[exp] = {};
    if (!massBalance[exp][brand]) massBalance[exp][brand] = { exp: 0, imp: 0 };
    massBalance[exp][brand].exp += weight;

    if (!massBalance[imp]) massBalance[imp] = {};
    if (!massBalance[imp][brand]) massBalance[imp][brand] = { exp: 0, imp: 0 };
    massBalance[imp][brand].imp += weight;

    // Route Intel
    const routeKey = `${origin}->${dest}`;
    if (!routeIntel[routeKey]) routeIntel[routeKey] = { weight: 0, amount: 0, entities: new Set() };
    routeIntel[routeKey].weight += weight;
    routeIntel[routeKey].amount += amt;
    routeIntel[routeKey].entities.add(exp);

    // Brand prices
    if (!brandPrices[brand]) brandPrices[brand] = [];
    if (unitPrice > 0) brandPrices[brand].push(unitPrice);

    // price anomaly flag (_isPrice)
    const avgPrice = brandPrices[brand].reduce((a, c) => a + c, 0) / brandPrices[brand].length;
    r._isPrice = avgPrice > 0 && (unitPrice > avgPrice * 1.3 || unitPrice < avgPrice * 0.7);
    if (r._isPrice) entityStats[exp].price += 1;
  });

  // Compute brand averages
  const brandAvgs = {};
  Object.keys(brandPrices).forEach(b => {
    brandAvgs[b] = brandPrices[b].reduce((a, c) => a + c, 0) / brandPrices[b].length;
  });

  // Compute HS mismatch flag (_isHS)
  cleanedData.forEach(r => {
    r._isHS = brandToHS[r.Brand] !== r["HS Code"];
  });

  // ✅ Run external engines AFTER all flags
  let intelLayer = {}, rings = [], cycles = [], shells = [], shellScores = {}, corridors = [], anomalies = [];
  let tobaccoSignals = [], uTurnEntities = [], vatEntities = [], phantomEntities = [], priceEntities = [], mlScores = {}, fraudProb = 0;

  try { intelLayer = runIntelEngine(cleanedData); } catch(e){ console.error(e); }
  try { rings = detectFraudRings(cleanedData); } catch(e){ console.error(e); }
  try { cycles = detectUTurnTrade(cleanedData); } catch(e){ console.error(e); }
  try { shells = detectShellCompanies(cleanedData); } catch(e){ console.error(e); }
  try { shellScores = calculateShellScore(cleanedData); } catch(e){ console.error(e); }
  try { corridors = detectTradeCorridors(cleanedData); } catch(e){ console.error(e); }
  try { anomalies = mlScore(cleanedData); } catch(e){ console.error(e); }

  try { tobaccoSignals = detectTobaccoFraud(cleanedData); } catch(e){ console.error(e); }
  try { uTurnEntities = detectUTurnTrade(cleanedData); } catch(e){ console.error(e); }
  try { vatEntities = detectVATCarousel(cleanedData); } catch(e){ console.error(e); }
  try { phantomEntities = detectPhantomExporter(cleanedData); } catch(e){ console.error(e); }
  try { priceEntities = detectPriceFraud(cleanedData); } catch(e){ console.error(e); }
  try { mlScores = runFraudEngine(cleanedData); } catch(e){ console.error(e); }
  try { fraudProb = calculateFraudProbability(cleanedData, intelLayer); } catch(e){ console.error(e); }

  // Apply external scores to entities
  Object.keys(entityStats).forEach(e => {
    if (mlScores[e]) entityStats[e].mlRisk = mlScores[e];
    if (shellScores[e]) entityStats[e].shellRisk = shellScores[e];
    if (rings.find(r => r?.includes?.(e))) entityStats[e].ringScore += 1;
    if (cycles.find(c => c?.includes?.(e))) entityStats[e].cycleScore += 1;
  });

  // Update React state
  setData(cleanedData);
  setIntel(intelLayer);
  setFraudStats({ vat: vatEntities, phantom: phantomEntities, price: priceEntities, uturn: uTurnEntities, mlScores });
  setStats({
    totalWeight,
    totalAmt,
    entityStats,
    massBalance,
    selfAgg,
    routeIntel,
    hsAgg,
    brandAvgs,
    amountBuckets,
    tobaccoSignals,
    fraudProbability: fraudProb,
    rings,
    cycles,
    shells,
    corridors
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

<TabBtn active={activeTab === 'ers'} onClick={() => setActiveTab('ers')} icon={<Activity size={18}/>} label="ERS Score" />

<TabBtn active={activeTab === 'networkGraph'} onClick={() => setActiveTab('networkGraph')} icon={<Activity size={18}/>} label="Trade Network" />

<TabBtn active={activeTab === 'mass'} onClick={() => setActiveTab('mass')} icon={<Scale size={18}/>} label="Mass Balance" />

<TabBtn active={activeTab === 'self'} onClick={() => setActiveTab('self')} icon={<ArrowLeftRight size={18}/>} label="Self Trade Deep-Dive" />

<TabBtn active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<DollarSign size={18}/>} label="Financial Forensics" />

<TabBtn active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<Globe size={18}/>} label="Map Intel" />

<TabBtn active={activeTab === 'heat'} onClick={() => setActiveTab('heat')} icon={<Globe size={18}/>} label="Fraud Heatmap" />

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
                      <td>
  {((row._isPrice ? 0.3 : 0) +
    (row._isSelf ? 0.3 : 0) +
    (row._isHS ? 0.2 : 0)).toFixed(2)}
</td>
                      <thead className="bg-slate-900 text-white text-xs font-black uppercase">
  <tr>
    <th className="p-5">
      <div className="flex flex-col gap-2">
        <span>Risk Flag</span>
        <select 
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="bg-slate-800 text-blue-400 border border-slate-700 rounded px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">ALL SHIPMENTS</option>
          <option value="self">SELF TRADE</option>
          <option value="hs">HS MISMATCH</option>
          <option value="price">PRICE ANOMALY</option>
        </select>
      </div>
    </th>
    <th className="p-5">Date</th>
    <th className="p-5">Entity Involved</th>
    <th className="p-5">Brand / HS</th>
    <th className="p-5">Route</th>
    <th className="p-5 text-right">Weight (Kg)</th>
    <th className="p-5 text-right">Amount ($)</th>
  </tr>
</thead>
                        <tbody className="divide-y-2 divide-slate-100 text-slate-800 font-bold">
  {filteredData.map((row, i) => (
    <tr key={i} className={`${row._isSelf ? 'bg-red-50' : 'hover:bg-slate-50'} transition-colors`}>
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
        <div className="text-xs flex items-center gap-1 uppercase">
          <MapPin size={12}/> {row['Origin Country']} &rarr; {row['Destination Country']}
        </div>
      </td>
      <td className="p-5 text-right text-base font-black">{row['Weight(Kg)']}</td>
      <td className="p-5 text-right text-lg font-black text-slate-900">
        ${(row['Amount($)'] || 0).toLocaleString()}
      </td>
    </tr>
  ))}
</tbody>

<tfoot className="bg-slate-100 border-t-4 border-slate-900 font-black text-slate-900 uppercase">
  <tr>
    <td colSpan="5" className="p-6 text-right text-xl">
      {activeFilter !== 'all' ? `${activeFilter} Total:` : 'Total Audit Volume:'}
    </td>
    <td className="p-6 text-right text-2xl">
      {visibleTotals.weight.toFixed(2)} KG
    </td>
    <td className="p-6 text-right text-3xl text-red-700">
      ${visibleTotals.amount.toLocaleString()}
    </td>
  </tr>
</tfoot>
                    </table>
                </div>
            </div>
          )}

          {/* TAB: FINAL ANALYSIS (AI SUMMARY) */}
          {activeTab==="final" && (

<div className="bg-white p-8 rounded-2xl shadow">

<h2 className="text-2xl font-black mb-4">
AI Intelligence Summary
</h2>

<pre className="whitespace-pre-wrap text-slate-700">

{narrative}

</pre>

</div>

)}

{/* TAB: ERS SCORING */}
{activeTab === "ers" && (
  <div className="space-y-6">
    {/* 1. The Entity Cards Loop */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {entityERS.map((entity) => (
        <div key={entity.name} className="bg-white p-6 rounded-[2.5rem] border-4 border-slate-900 shadow-xl">
          <h3 
  onClick={() => setSelectedEntity(entity.name)}
  className="text-xl font-black uppercase truncate cursor-pointer hover:text-blue-600"
>
  {entity.name}
</h3>
          
          {/* PLACE THE FORENSIC EVIDENCE BLOCK HERE */}
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
              Forensic Evidence
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-black text-slate-900">{entity.priceAnomaly}</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase">Price Deviations</div>
              </div>
              <div className="border-l pl-4">
                <div className="text-lg font-black text-slate-900">{entity.transactions - entity.priceAnomaly}</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase">Clean Invoices</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* 2. THE AI SUMMARY (Place this OUTSIDE the map, at the very bottom) */}
<AISummary 
  title="AI Forensic Summary"
  icon={Brain}
  content={
    <>
      <p className="mb-4">
        Analysis detected that several transactions lacked a declared <span className="font-bold underline text-blue-800">Unit Price($)</span>. 
        The system auto-calculated values based on <span className="italic">Total Amount / Weight</span> to fill these gaps.
      </p>
      
      <div className="bg-white px-4 py-3 rounded-xl border border-blue-100 shadow-sm">
        <span className="text-red-600 font-black mr-2">ALERT:</span>
        <span className="font-bold text-slate-900">
          {entityERS.filter(e => e.priceAnomaly > 0).length} entities
        </span> show prices deviating significantly from the brand median. 
        {entityERS.filter(e => e.priceAnomaly > 0).length > 0 && (
          <span className="text-slate-600 ml-1">
            Top risk: <span className="uppercase font-black">{entityERS.find(e => e.priceAnomaly > 0)?.name}</span>.
          </span>
        )}
        <AISummary
  title="ERS Intelligence Summary"
  icon={Brain}
  content={generateNarrative(stats, fraudStats)}
/>
      </div>
    </>
      }
/>
    {/* METHODOLOGY FOOTER */}
    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 border-t-2 border-slate-100 pt-8">
      <div>
        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">What is ERS?</h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>Entity Risk Scoring</strong> is a weighted forensic index (0-100) that aggregates suspicious trade patterns like self-trading, HS mismatches, and price manipulation.
        </p>
      </div>
      <div>
        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Brand Median Logic</h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          The system calculates a global baseline price for each brand by auditing the <strong>Total Value vs Total Weight</strong> across all shipments in the current dataset.
        </p>
      </div>
      <div>
        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Anomaly Detection</h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          Transactions are flagged if the unit price deviates by <strong>±30%</strong> from the brand median.
        </p>
      </div>
    </div>
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
{activeTab==="self" && (() => {

let importsWeight=0, importsQty=0, importsAmt=0;
let exportsWeight=0, exportsQty=0, exportsAmt=0;

const importCountries = new Set();
const exportCountries = new Set();
const brands = new Set();

data.forEach(r=>{
  if(r.Exporter === r.Importer){

    const w = parseFloat(r["Weight(Kg)"]||0);
    const q = parseFloat(r["Quantity"]||0);
    const a = parseFloat(r["Amount($)"]||0);

    importsWeight += w;
    importsQty += q;
    importsAmt += a;

    exportsWeight += w;
    exportsQty += q;
    exportsAmt += a;

    importCountries.add(r["Origin Country"]);
    exportCountries.add(r["Destination Country"]);
    brands.add(r.Brand);
  }
});

const mismatch = Math.abs(importsWeight - exportsWeight);
const fraudScore = mismatch > 0 ? "HIGH RISK" : "CIRCULAR TRADE";

return (

<div className="bg-white p-6 rounded-xl shadow">

<h2 className="text-2xl font-bold mb-6">
Self Trade Intelligence
</h2>

<div className="grid grid-cols-2 gap-6">

<div>
<h3 className="font-bold">Imports</h3>
<div>Weight: {importsWeight.toFixed(2)}</div>
<div>Quantity: {importsQty}</div>
<div>Amount: ${importsAmt.toLocaleString()}</div>
<div>Countries: {[...importCountries].join(", ")}</div>
</div>

<div>
<h3 className="font-bold">Exports</h3>
<div>Weight: {exportsWeight.toFixed(2)}</div>
<div>Quantity: {exportsQty}</div>
<div>Amount: ${exportsAmt.toLocaleString()}</div>
<div>Countries: {[...exportCountries].join(", ")}</div>
</div>

</div>

<div className="mt-6">

<h3 className="font-bold">Brands Involved</h3>
<div className="text-sm">{[...brands].join(", ")}</div>

<h3 className="font-bold mt-4">Conclusion</h3>

<div className="text-sm text-slate-700">

Mismatch: {mismatch.toFixed(2)} KG  
Flag: <b>{fraudScore}</b>  

Possible fraud:
• Round-tripping  
• VAT carousel layering  
• Trade-based money laundering  

</div>

</div>
<AISummary
  title="Circular Trade Insight"
  icon={ArrowLeftRight}
  content={`Detected ${data.filter(d=>d._isSelf).length} circular trades. Potential VAT carousel behavior.`}
/>
</div>

);

})()}

          {/* TAB: FINANCIAL FORENSICS */}
{activeTab === "finance" && (

<div className="space-y-6">

  <h2 className="text-2xl font-black">
    Financial Forensics Intelligence
  </h2>

  {/* ---------------- SUMMARY ---------------- */}
  <div className="grid grid-cols-3 gap-4">

    <div className="bg-slate-100 p-4 rounded-xl">
      <div className="text-sm text-slate-500">Median Price</div>
      <div className="text-xl font-bold">${fin.avgPrice?.toFixed(2)}</div>
    </div>

    <div className="bg-slate-100 p-4 rounded-xl">
      <div className="text-sm text-slate-500">Anomaly Rate</div>
      <div className="text-xl font-bold">{fin.anomalyRate}%</div>
    </div>

    <div className="bg-red-100 p-4 rounded-xl">
      <div className="text-sm text-red-600">Estimated Tax Loss</div>
      <div className="text-xl font-bold">
        ${fin.taxLoss.toLocaleString()}
      </div>
    </div>

  </div>

  {/* ---------------- ANOMALIES ---------------- */}
  <div>

    <h3 className="text-lg font-bold mb-3 text-red-600">
      Value Manipulation Signals
    </h3>

    {fin.anomalies.slice(0,20).map((a,i)=>(
      <div key={i} className="border p-3 mb-2 rounded bg-red-50">

        <div className="font-bold">{a.entity}</div>

        <div className="text-sm">
          Price: ${a.price} vs Median ${a.median}<br/>
          Deviation: {a.deviation}%<br/>
          Weight: {a.weight} KG<br/>
          Value: ${a.amount.toLocaleString()}<br/>
          <span className="text-red-600 font-semibold">
            {a.reason}
          </span>
        </div>

      </div>
    ))}

  </div>

  {/* ---------------- CLUSTERS ---------------- */}
  <div>

    <h3 className="text-lg font-bold mb-3 text-blue-600">
      Invoice Pattern Clusters
    </h3>

    {fin.clusters.map((c,i)=>(
      <div key={i} className="text-sm border-b py-2">

        <b>{c.exporter}</b> → Price Band ${c.priceBand}<br/>
        Shipments: {c.shipments} | 
        Value: ${c.totalValue.toLocaleString()}

      </div>
    ))}

  </div>
<AISummary
  title="Financial Risk Insight"
  icon={DollarSign}
  content={`Anomaly rate is ${fin.anomalyRate}%. Estimated tax leakage: $${fin.taxLoss.toLocaleString()}.`}
 />
</div>

)}

          {/* TAB: MAP INTEL */}
     {/* TAB: MAP INTEL */}
{activeTab === "map" && (
  <div className="bg-slate-900 p-12 rounded-[4rem] text-white animate-in fade-in">
      <h2 className="text-3xl font-black uppercase mb-10 flex items-center gap-4">
          <Globe className="text-blue-500"/> Trade Corridor Density
      </h2>
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
    <AISummary
  title="Corridor Intelligence"
  icon={Globe}
  content={`High-volume corridors detected: ${Object.keys(stats.routeIntel).length}`}
 />
  </div>
)}

{/* TAB: FRAUD HEATMAP */}
{activeTab === "heat" && (
  <div className="bg-black p-6 rounded-2xl">
      <RouteRiskMap 
  data={data} 
  fraudStats={fraudStats}
  corridors={intel.corridors}
/>
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
                    <AISummary
      title="HS Intelligence Insight"
      icon={BookOpen}
      content={`Detected ${Object.keys(stats.hsAgg || {}).length} aggregated HS clusters across entities.`}
    />
              </div>
          )}

{activeTab === "fraud" && (
  <div>
    <FraudIntelligenceCard 
      stats={stats}
      fraudStats={fraudStats}
    />

    <AISummary
      title="Fraud Engine Summary"
      icon={AlertTriangle}
      content={generateNarrative(stats, fraudStats)}
    />
  </div>
)}

{/* TAB: NETWORK GRAPH */}
{activeTab === "networkGraph" && (
  <div className="bg-white p-10 rounded-3xl border-4 border-slate-900 shadow-xl">
      <NetworkGraph 
  data={data} 
  fraudStats={fraudStats}
  rings={intel.rings}
/>
    <AISummary
      title="Network Intelligence"
      icon={Layers}
      content={`Detected ${intel?.rings?.length || 0} potential fraud rings in the trade network.`}
    />
  </div>
)}
          {activeTab === "guide" && <GuideView />}
{selectedEntity && ( 
  <EntityInvestigation
    entity={selectedEntity}
    data={data}
    stats={stats}
    intel={stats}   // use stats for now (safe)
  />
)}
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
      <GuideItem 
  title="Fraud Rings Detection"
  logic="Graph Loop Analysis"
  desc="Identifies multi-entity trade loops indicating cartel coordination or VAT carousel fraud."
/>

<GuideItem 
  title="Shell Entity Probability"
  logic="Behavioral + Network Scoring"
  desc="Scores entities based on abnormal routing, low diversity, and circular trade patterns."
/>

<GuideItem 
  title="Cycle Detection"
  logic="Recursive Trade Loop Detection"
  desc="Finds repeated circular trade paths used for laundering or tax arbitrage."
/>

<GuideItem 
  title="Corridor Heatmap"
  logic="Route Risk Aggregation"
  desc="Maps high-risk smuggling corridors based on anomaly density and trade volume."
/>

<GuideItem 
  title="ML Anomaly Detection"
  logic="Outlier Ranking"
  desc="Identifies top 1% abnormal transactions using statistical and behavioral signals."
/>
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
// Place your AISummary component HERE (outside the Dashboard function)
const AISummary = ({ title, content, icon: Icon }) => (
  <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-3xl mt-8">
    <div className="flex items-center gap-2 mb-3 text-blue-900 font-black uppercase text-sm">
      {Icon && <Icon size={20} />} {title}
    </div>
    <div className="text-slate-700 text-sm leading-relaxed font-medium">
      {content}
    </div>
  </div>
);      
