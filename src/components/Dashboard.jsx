import React, { useState, useMemo } from 'react';
import Papa from 'papaparse'; 
import { 
  AlertTriangle, ShieldCheck, Activity, Globe, Link as LinkIcon, 
  TrendingUp, Search, BarChart3, ListFilter, ShieldAlert, FileText, 
  BookOpen, Network, Zap, Percent, Scale, DownloadCloud, AlertOctagon, 
  Layers, Calendar, MapPin, ArrowLeftRight, Info, DollarSign, Brain, AlertCircle,
  ArrowRight
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

const generateNarrative = (stats, fraudStats, entityERS) => {
  if (!stats || !entityERS) return "Awaiting trade data for forensic analysis...";

  const totalValue = (stats.totalAmt || 0).toLocaleString();
  const highRiskEntities = entityERS.filter(e => e.priceAnomaly > 0).length;
  const topVulnerable = entityERS.sort((a, b) => b.priceAnomaly - a.priceAnomaly)[0]?.name || "None";

  return (
    <div className="space-y-4">
      <p>
        The forensic engine audited a total trade volume of <span className="font-bold text-blue-900">${totalValue}</span>. 
        By establishing a <span className="italic">Weight-Based Price Baseline</span> for each brand, we identified 
        <span className="font-bold text-red-600"> {highRiskEntities} entities</span> showing significant price suppression.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="p-3 bg-white/50 rounded-lg border border-blue-200">
          <span className="text-[10px] font-black uppercase text-blue-400 block">Primary Risk Vector</span>
          <span className="text-sm font-bold text-blue-900">Under-Invoicing (Value Manipulation)</span>
        </div>
        <div className="p-3 bg-white/50 rounded-lg border border-blue-200">
          <span className="text-[10px] font-black uppercase text-blue-400 block">Highest Exposure</span>
          <span className="text-sm font-bold text-red-700 uppercase">{topVulnerable}</span>
        </div>
      </div>
    </div>
  );
};
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
  const [ersView, setErsView] = useState('exporter'); // 'exporter' or 'importer'
const entityERS = useMemo(() => {
  if (!stats.entityStats) return [];
  return Object.entries(stats.entityStats).map(([name, s]) => {
    // FIXED: Removed the floating "(" and combined the math correctly
    const raw =
      (s.self * 20) +
      (s.hs * 15) +
      (s.price * 20) +
      (s.density * 30) +
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
const tradeLinks = useMemo(() => {
  if (!data || data.length === 0) return [];
  return data.map(d => ({
    source: d.Exporter,
    target: d.Importer,
    value: d["Amount($)"]
  }));
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
  // 1. Helper for strict number parsing
  const parseVal = (v) => {
    if (v === undefined || v === null) return 0;
    const n = parseFloat(v.toString().replace(/,/g, "").replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  // 2. Preprocess & Normalize Data
  const cleanedData = rawData.map((r) => {
    const row = {};
    Object.keys(r).forEach((k) => {
      const key = k.trim();
      row[key] = typeof r[k] === "string" ? r[k].trim() : r[k];
    });

    const weight = parseVal(row["Weight(Kg)"]);
    const amount = parseVal(row["Amount($)"]);
    const pricePerKg = weight > 0 ? amount / weight : 0;
    const rawQty = parseVal(row["Quantity"]);
    const unit = (row["Quantity Unit"] || "").toUpperCase();
    
    let kgPerStick = 0;
    let isDensityAnomaly = false;
    const isStickUnit = unit.includes("STICK") || unit.includes("PCS") || unit.includes("PC");
    const isPackUnit = unit.includes("PACK");

    if (rawQty > 0 && (isStickUnit || isPackUnit)) {
        const totalSticks = isPackUnit ? rawQty * 20 : rawQty;
        kgPerStick = weight / totalSticks;
        // Forensic density threshold for tobacco sticks
        isDensityAnomaly = kgPerStick > 0.0011 || kgPerStick < 0.0006;
    }

    return {
      ...row,
      Exporter: row["Exporter"] || "UNKNOWN",
      Importer: row["Importer"] || "UNKNOWN",
      Brand: row["Brand"] || "UNKNOWN",
      "HS Code": row["HS Code"] || "UNKNOWN",
      "Amount($)": amount,
      "Weight(Kg)": weight,
      Quantity: rawQty,
      _pricePerKg: pricePerKg,
      _kgPerStick: kgPerStick,
      _isDensityAnomaly: isDensityAnomaly,
      _isSelf: (row["Exporter"] === row["Importer"] && row["Exporter"] !== "UNKNOWN" && row["Exporter"] !== ""),
    };
  });

  // 3. Initialize Forensic Aggregates
  const entityStats = {};
  const brandToHS = {};
  const brandTotals = {};
  const selfTradeData = {}; 
  const hsAgg = {};
  let totalWeight = 0;      
  let totalAmt = 0;          
  let totalCircularVolume = 0; 

  // --- PASS 1: GLOBAL TOTALS & BRAND BASELINES ---
  cleanedData.forEach(r => {
    const brand = r.Brand || "UNKNOWN";
    totalAmt += r["Amount($)"];
    totalWeight += r["Weight(Kg)"];

    if (!brandTotals[brand]) brandTotals[brand] = { weight: 0, amount: 0 };
    brandTotals[brand].weight += r["Weight(Kg)"];
    brandTotals[brand].amount += r["Amount($)"];

    // Populate HS Aggregation for the HS Tab
    const hsKey = `${r.Exporter}-${r["HS Code"]}`;
    if (!hsAgg[hsKey]) {
      hsAgg[hsKey] = { entity: r.Exporter, hs: r["HS Code"], brand: r.Brand, count: 0, amount: 0 };
    }
    hsAgg[hsKey].count++;
    hsAgg[hsKey].amount += r["Amount($)"];
  });

  const brandBaselines = {}; 
  Object.keys(brandTotals).forEach(b => {
    brandBaselines[b] = brandTotals[b].weight > 0 ? brandTotals[b].amount / brandTotals[b].weight : 0;
  });

  // --- PASS 2: FORENSIC ATTRIBUTION ---
  cleanedData.forEach(r => {
    const exp = r.Exporter;
    const imp = r.Importer;
    const brand = r.Brand;
    const hs = r["HS Code"];

    // A. Price Deviation
    const unitPrice = r._pricePerKg;
    const median = brandBaselines[brand] || 0;
    r._isPrice = median > 0 && (unitPrice > median * 1.3 || unitPrice < median * 0.7);

    // B. HS Consistency Check
    if (!brandToHS[brand]) brandToHS[brand] = hs;
    r._isHS = brandToHS[brand] !== hs;

    // C. Circular Trade Accumulation
   if (r._isSelf) {
  if (!selfTradeData[exp]) {
    selfTradeData[exp] = { 
      amount: 0, 
      weight: 0, 
      count: 0, 
      countries: new Set(), // Using Sets to keep list unique
      brands: new Set() 
    };
}
  selfTradeData[exp].amount += r["Amount($)"];
  selfTradeData[exp].weight += r["Weight(Kg)"];
  selfTradeData[exp].count += 1;
  selfTradeData[exp].countries.add(r["Origin Country"]);
  selfTradeData[exp].countries.add(r["Destination Country"]);
  selfTradeData[exp].brands.add(r.Brand);
  totalCircularVolume += r["Amount($)"];
}

    // D. Build Entity Risk Profiles
    [exp, imp].forEach(e => {
      if (!entityStats[e]) {
        entityStats[e] = { 
          self: 0, hs: 0, price: 0, density: 0, transactions: 0, priceAnomaly: 0,
          isExporter: false, isImporter: false 
        };
      }
    });

    entityStats[exp].isExporter = true;
    entityStats[imp].isImporter = true;
    entityStats[exp].transactions++;
    entityStats[imp].transactions++;

    if (r._isPrice) { entityStats[exp].priceAnomaly++; entityStats[imp].priceAnomaly++; }
    if (r._isSelf) { entityStats[exp].self++; }
    if (r._isHS) { entityStats[exp].hs++; entityStats[imp].hs++; }
    if (r._isDensityAnomaly) { entityStats[exp].density++; entityStats[imp].density++; }
  });

  // --- PASS 3: EXTERNAL ENGINES ---
  let intelLayer = {}, rings = [], cycles = [], shells = [], corridors = {}, mlScores = {}, fraudProb = 0;

  try { intelLayer = runIntelEngine(cleanedData); } catch(e){ console.error("Intel Engine Error:", e); }
  try { rings = detectFraudRings(cleanedData); } catch(e){ console.error("Ring Engine Error:", e); }
  try { cycles = detectUTurnTrade(cleanedData); } catch(e){ console.error("Cycle Engine Error:", e); }
  try { corridors = detectTradeCorridors(cleanedData); } catch(e) { console.error("Corridor Engine Error:", e); }
  try { mlScores = runFraudEngine(cleanedData); } catch(e){ console.error("ML Engine Error:", e); }
  try { fraudProb = calculateFraudProbability(cleanedData, intelLayer); } catch(e){ console.error("Prob Engine Error:", e); }

  // Merge external risk scores into EntityStats
  Object.keys(entityStats).forEach(e => {
    if (mlScores[e]) entityStats[e].mlRisk = mlScores[e];
    if (rings.find(r => r?.includes?.(e))) entityStats[e].ringScore = (entityStats[e].ringScore || 0) + 1;
  });

 // --- FINAL STATE SYNC ---
  
  // 1. Convert Sets to Arrays so the UI doesn't crash
  const finalSelfTradeData = {};
  Object.entries(selfTradeData).forEach(([entity, data]) => {
    finalSelfTradeData[entity] = {
      ...data,
      countries: Array.from(data.countries || []),
      brands: Array.from(data.brands || [])
    };
  });

  // 2. Update main data state
  setData(cleanedData);
  setIntel(intelLayer);

  // 3. Update unified stats object (Note the change to selfTradeData)
  setStats({
    totalWeight,
    totalAmt,
    totalCircularVolume,
    selfTradeData: finalSelfTradeData, // <--- Use the converted version here
    entityStats,
    routeIntel: corridors,
    brandBaselines,
    hsAgg,
    rings,
    cycles,
    fraudProbability: fraudProb
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
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-900 text-white text-[10px] font-black uppercase">
          <tr>
            <th className="p-5">
              <div className="flex flex-col gap-2">
                <span>Risk Flag</span>
                <select 
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="bg-slate-800 text-blue-400 border border-slate-700 rounded px-2 py-1 text-[10px] focus:outline-none cursor-pointer"
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
            <th className="p-5 text-right">Declared Qty</th>
            <th className="p-5 text-right">Density</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-slate-100 text-slate-800 font-bold">
          {filteredData.map((row, i) => {
            // Risk Calculation logic preserved
            const sScore = row._isSelf ? 0.3 : 0;
            const hScore = row._isHS ? 0.2 : 0;
            const pScore = row._isPrice ? 0.3 : 0;
            const dScore = row._isDensityAnomaly ? 0.3 : 0;
            const totalRisk = sScore + hScore + pScore + dScore;
            
            const riskTooltip = [
              row._isSelf ? `• Self-Trade (+0.30)` : null,
              row._isHS ? `• HS Mismatch (+0.20)` : null,
              row._isPrice ? `• Price Anomaly (+0.30)` : null,
              row._isDensityAnomaly ? `• Density Anomaly (+0.30)` : null
            ].filter(Boolean).join('\n') || "No Risks Detected";

            return (
              <tr key={i} className={`${row._isSelf ? 'bg-red-50' : 'hover:bg-slate-50'} border-b border-slate-100 transition-colors`}>
                <td className="p-5">
                  <div 
                    className="text-sm font-black border-b border-dotted border-slate-400 inline-block cursor-help" 
                    title={riskTooltip}
                  >
                    {totalRisk.toFixed(2)}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {row._isSelf && <span className="bg-red-700 text-white text-[8px] px-1.5 py-0.5 rounded">SELF</span>}
                    {row._isHS && <span className="bg-orange-600 text-white text-[8px] px-1.5 py-0.5 rounded">HS</span>}
                    {row._isPrice && <span className="bg-purple-700 text-white text-[8px] px-1.5 py-0.5 rounded">PRICE</span>}
                    {row._isDensityAnomaly && <span className="bg-yellow-600 text-white text-[8px] px-1.5 py-0.5 rounded">DENSITY</span>}
                  </div>
                </td>

                <td className="p-5 text-xs text-slate-500 font-bold">{row.Date}</td>

                <td className="p-5">
                  <div className="text-sm font-black uppercase truncate max-w-[140px]">{row.Exporter}</div>
                  <div className="text-[11px] text-blue-800 font-black uppercase mt-0.5 italic">To: {row.Importer}</div>
                </td>

                <td className="p-5">
                  <div className="text-sm font-black uppercase">{row.Brand}</div>
                  <div className="text-[11px] text-slate-900 font-black mt-0.5">HS: {row["HS Code"]}</div>
                </td>

                <td className="p-5">
                  <div className="text-[11px] font-black uppercase flex items-center gap-1 text-slate-700">
                    {row["Origin Country"]} <ArrowRight size={10} strokeWidth={3}/> {row["Destination Country"]}
                  </div>
                </td>

                {/* KEY FIX: Using normalized numeric keys from analyzeFraud */}
                <td className="p-5 text-right font-black text-slate-900">
                  {(row["Weight(Kg)"] || 0).toLocaleString(undefined, {minimumFractionDigits: 1})}
                </td>
                <td className="p-5 text-right font-black text-slate-900">
                  ${(row["Amount($)"] || 0).toLocaleString()}
                </td>

                <td className="p-5 text-right">
                  <div className="text-sm font-black text-slate-700">{(row.Quantity || 0).toLocaleString()}</div>
                  <div className="text-[8px] font-black text-blue-500 uppercase">{row["Quantity Unit"]}</div>
                </td>

                <td className="p-5 text-right text-xs font-mono">
                  {row["Quantity Unit"]?.toLowerCase().includes('stick') 
                    ? (row["Weight(Kg)"] / row.Quantity).toFixed(4) 
                    : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-100 border-t-4 border-slate-900 font-black text-slate-900">
          <tr>
            <td colSpan="5" className="p-6 text-right text-lg uppercase">Audit Totals:</td>
            <td className="p-6 text-right text-xl">
               {/* Ensure visibleTotals is calculated using filteredData amount/weight */}
               {(filteredData.reduce((acc, curr) => acc + (curr["Weight(Kg)"] || 0), 0)).toFixed(2)} KG
            </td>
            <td className="p-6 text-right text-2xl text-red-700">
               ${(filteredData.reduce((acc, curr) => acc + (curr["Amount($)"] || 0), 0)).toLocaleString()}
            </td>
            <td></td>
            <td></td>
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
  <div className="space-y-6 pb-20">
    {/* VIEW TOGGLE */}
    <div className="flex justify-center mb-10">
      <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-2 border-2 border-slate-200">
        <button 
          onClick={() => setErsView('exporter')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${ersView === 'exporter' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
        >
          Exporter Risk
        </button>
        <button 
          onClick={() => setErsView('importer')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${ersView === 'importer' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
        >
          Importer Risk
        </button>
      </div>
    </div>

    {/* CARDS */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {entityERS
        .filter(e => ersView === 'exporter' ? e.isExporter : e.isImporter)
        .sort((a, b) => b.priceAnomaly - a.priceAnomaly)
        .map((entity) => (
          <div key={entity.name} className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-xl relative">
            <div className="absolute top-4 right-4 text-[8px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase">
              {ersView}
            </div>
            <h3 className="text-xl font-black uppercase truncate mb-4 pr-10">{entity.name}</h3>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black text-red-600">{entity.priceAnomaly || 0}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Anomalies</div>
                </div>
                <div className="border-l">
                  <div className="text-2xl font-black text-slate-900">{entity.transactions}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">Shipments</div>
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>

    {/* AI FORENSIC SUMMARY */}
    <div className="bg-blue-50 p-8 rounded-[2.5rem] border-4 border-blue-900 mt-10">
      <div className="flex items-center gap-3 mb-4 text-blue-900">
        <Brain size={32} />
        <h2 className="text-2xl font-black uppercase italic">AI Forensic Intelligence</h2>
      </div>
      <div className="text-blue-900 font-bold">
        {generateNarrative(stats, fraudStats, entityERS.filter(e => ersView === 'exporter' ? e.isExporter : e.isImporter))}
      </div>
    </div>

    {/* METHODOLOGY FOOTER */}
    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 border-t-2 border-slate-200 pt-8">
      <div>
        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">What is ERS?</h4>
        <p className="text-xs text-slate-600">Weighted forensic index (0-100) aggregating trade patterns.</p>
      </div>
      <div>
        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Brand Median Logic</h4>
        <p className="text-xs text-slate-600">Baselines calculated via $Total Value / Total Weight$.</p>
      </div>
      <div>
        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Responsibility</h4>
        <p className="text-xs text-slate-600">Exporters declare the data; Importers are flagged as high-risk counterparties.</p>
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

{activeTab === "self" && (
  <div className="animate-in fade-in space-y-8">
    {/* 1. HEADER STATS - Compact Version */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-red-700 p-6 rounded-[2rem] text-white shadow-xl border-b-4 border-red-900">
        <div className="text-[9px] font-black uppercase opacity-80 tracking-widest">Circular Trade Volume</div>
        <div className="text-3xl font-black mt-1">
          ${(stats.totalCircularVolume || 0).toLocaleString()}
        </div>
      </div>
      
      <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl md:col-span-2 flex items-center justify-between border-b-4 border-slate-950">
        <div>
          <div className="text-[9px] font-black uppercase text-blue-400 tracking-widest">Risk Entities Identified</div>
          <div className="text-3xl font-black mt-1">
            {Object.keys(stats.selfTradeData || {}).length} Unique Actors
          </div>
        </div>
        <div className="bg-slate-800 p-3 rounded-full">
          <AlertCircle size={28} className="text-red-500" />
        </div>
      </div>
    </div>

    {/* 2. ENTITY BREAKDOWN GRID */}
    <div className="space-y-6">
      {Object.entries(stats.selfTradeData || {}).sort((a,b) => b[1].amount - a[1].amount).map(([entity, data]) => (
        <div key={entity} className="bg-white border-4 border-slate-900 rounded-[2.5rem] overflow-hidden shadow-xl">
          {/* Entity Header */}
          <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center font-black">{entity.charAt(0)}</div>
              <div>
                <div className="text-[10px] text-slate-400 font-black uppercase">Forensic Entity ID</div>
                <div className="font-black text-xl leading-tight uppercase tracking-tight">{entity}</div>
              </div>
            </div>
            <div className="bg-red-600 text-[10px] px-3 py-1 rounded-full font-black">CRITICAL RISK</div>
          </div>

          {/* Risk & Network Analysis Section */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 border-b-2 border-slate-100">
            <div>
              <h3 className="text-blue-600 font-black text-[11px] uppercase mb-4 tracking-widest">Risk Analysis</h3>
              <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-6">
                <div className="text-red-800 font-black text-sm mb-2 uppercase">CRITICAL: CIRCULAR TRADE DETECTED</div>
                <p className="text-[13px] text-red-700 leading-relaxed font-bold">
                  Entity is shipping goods to itself. This is a primary indicator of <span className="underline">VAT Carousel Fraud</span> or <span className="underline">Trade-Based Money Laundering</span>.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-blue-600 font-black text-[11px] uppercase mb-4 tracking-widest">Network Footprint</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {(data.countries || []).map(c => (
                  <span key={c} className="bg-slate-900 text-white text-[11px] font-black px-4 py-2 rounded-full uppercase tracking-wide">
                    {c}
                  </span>
                ))}
              </div>
              <div className="text-sm font-black text-slate-800 leading-relaxed">
                <span className="text-slate-400 uppercase text-[10px] block mb-1">Associated Brands:</span>
                {data.brands?.join(', ')}
              </div>
            </div>
          </div>

          {/* Footer Financials - Bigger Font Focus */}
          <div className="px-8 py-8 bg-slate-50 flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-12">
              <div>
                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Circular Amount</div>
                <div className="text-4xl font-black text-red-700 tracking-tighter">${data.amount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Net Weight (KG)</div>
                <div className="text-4xl font-black text-slate-900 tracking-tighter">{data.weight.toLocaleString()}</div>
              </div>
            </div>
            <button 
              onClick={() => { setActiveFilter('self'); setActiveTab('audit'); }}
              className="bg-white border-4 border-slate-900 px-8 py-3 rounded-2xl text-[12px] font-black hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 shadow-lg"
            >
VIEW AUDIT TRAIL <ArrowRight size={16} strokeWidth={3}/>
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* 3. AI SUMMARY FOR SELF TRADE - Now correctly inside the "self" tab block */}
    {Object.keys(stats.selfTradeData || {}).length > 0 && (
      <AISummary
        title="Circular Trade Intel"
        icon={typeof AlertCircle !== 'undefined' ? AlertCircle : ShieldAlert}
        content={`Detected ${Object.keys(stats.selfTradeData).length} entities acting as both Exporter and Importer. The largest actor accounts for $${(Object.values(stats.selfTradeData).sort((a,b) => b.amount - a.amount)[0]?.amount || 0).toLocaleString()} of the wash-trade volume.`}
      />
    )}
  </div>
)}
          {/* TAB: FINANCIAL FORENSICS */}
{/* TAB: FINANCIAL FORENSICS */}
{activeTab === "finance" && (
  <div className="space-y-6">
    <h2 className="text-2xl font-black">Financial Forensics Intelligence</h2>

    {/* Summary Row */}
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
        <div className="text-xl font-bold">${fin.taxLoss.toLocaleString()}</div>
      </div>
    </div>

    {/* Anomalies List */}
    <div>
      <h3 className="text-lg font-bold mb-3 text-red-600">Value Manipulation Signals</h3>
      {fin.anomalies.slice(0,20).map((a, i) => (
        <div key={i} className="border p-3 mb-2 rounded bg-red-50">
          <div className="font-bold">{a.entity}</div>
          <div className="text-sm">
            Price: ${a.price} vs Median ${a.median}<br/>
            Deviation: {a.deviation}%<br/>
            Weight: {a.weight} KG<br/>
            Value: ${a.amount.toLocaleString()}<br/>
            <span className="text-red-600 font-semibold">{a.reason}</span>
          </div>
        </div>
      ))} {/* <--- Ensure this is closed */}
    </div>

    {/* Clusters List */}
    <div>
      <h3 className="text-lg font-bold mb-3 text-blue-600">Invoice Pattern Clusters</h3>
      {fin.clusters.map((c, i) => (
        <div key={i} className="text-sm border-b py-2">
          <b>{c.exporter}</b> → Price Band ${c.priceBand}<br/>
          Shipments: {c.shipments} | Value: ${c.totalValue.toLocaleString()}
        </div>
      ))} {/* <--- Ensure this is closed */}
    </div>

    <AISummary
      title="Financial Risk Insight"
      icon={DollarSign}
      content={`Anomaly rate is ${fin.anomalyRate}%. Estimated tax leakage: $${fin.taxLoss.toLocaleString()}.`}
    />
  </div>
)}
          {/* TAB: MAP INTEL */}
{activeTab === "map" && (
  <div className="bg-slate-900 p-12 rounded-[4rem] text-white animate-in fade-in">
    <h2 className="text-3xl font-black uppercase mb-10 flex items-center gap-4">
      <Globe className="text-blue-500"/> Trade Corridor Density
    </h2>
    <div className="space-y-4">
      {/* Object.entries converts the corridors object into a loopable list */}
      {Object.entries(stats.routeIntel || {}).map(([route, d]) => (
        <div key={route} className="p-8 bg-slate-800 rounded-[2rem] border-2 border-slate-700 flex justify-between items-center">
          <div>
            <div className="text-3xl font-black uppercase tracking-tighter text-blue-400">{route}</div>
            <div className="flex flex-wrap gap-2 mt-3">
              {/* Convert the Set to an Array for rendering */}
              {Array.from(d.entities || []).map(e => (
                <span key={e} className="text-[10px] font-black bg-slate-700 px-3 py-1 rounded text-slate-300 border border-slate-600 uppercase">
                  {e}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white">
              ${(d.amount || 0).toLocaleString()}
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {(d.weight || 0).toFixed(0)} KG TRANSACTED
            </div>
          </div>
        </div>
      ))}
    </div>
    
    <div className="mt-10">
      <AISummary
        title="Corridor Intelligence"
        icon={Globe}
        content={`High-volume corridors detected: ${Object.keys(stats.routeIntel || {}).length}. Major liquidity flow identified across ${Object.keys(stats.routeIntel || {}).length} routes.`}
      />
    </div>
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
