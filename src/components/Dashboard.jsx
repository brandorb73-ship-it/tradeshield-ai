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
import { HSTab } from './Tabs/HSTab.jsx';
import MassBalanceTab from "./Tabs/MassBalanceTab.jsx";
import EntityInvestigation from "./EntityInvestigation";
import { buildEntityProfile } from "../analytics/entityInvestigationEngine";
import { generateForensicReport } from '../utils/forensics.js';
import useERS from "../hooks/useERS";
import useMastermind from "../hooks/useMastermind";
import ERSPanel from "./ERSPanel";

const generateNarrative = (stats, fraudStats, entityERS) => {
  if (!stats || !entityERS) return "Awaiting trade data for forensic analysis...";

  const totalValue = (stats.totalAmt || 0).toLocaleString();
 const ersList = Object.values(entityERS || {});

const highRiskEntities = ersList.filter(e => (e?.summary?.priceIssues || 0) > 0).length;

const topVulnerable = ersList
  .sort((a,b)=>(b?.summary?.priceIssues||0)-(a?.summary?.priceIssues||0))[0]?.entity || "None";

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
  const ersData = useERS(stats);
const mastermindData = useMastermind(stats);
// ✅ GLOBAL HEADER
const globalIntel = useMemo(() => {
  const entities = Object.values(ersData || {});

  const high = entities.filter(e => (e?.ers?.total || 0) > 70).length;
  const medium = entities.filter(e => {
    const score = e?.ers?.total || 0;
    return score > 40 && score <= 70;
  }).length;

  return {
    high,
    medium,
    total: entities.length
  };
}, [ersData]);
  
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
  return generateNarrative(stats, fraudStats, ersData || {});
}, [stats, fraudStats, ersData]);
  
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
   const hsKey = `${r.Exporter}-${r["HS Code"]}-${r.Brand}`;
  if (!hsAgg[hsKey]) {
    hsAgg[hsKey] = { 
      entity: r.Exporter, 
      hs: r["HS Code"], 
      brand: r.Brand, 
      count: 0, 
      amount: 0 
    };
  }
  hsAgg[hsKey].count++;
  hsAgg[hsKey].amount += (r["Amount($)"] || 0);
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
if (exp === imp) {
  entityStats[exp].transactions++; // self trade = 1
} else {
  entityStats[exp].transactions++;
  entityStats[imp].transactions++;
}

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
// --- NEW: MASS BALANCE CALCULATION ---
const massBalance = {};
cleanedData.forEach(r => {
  const exp = r.Exporter;
  const imp = r.Importer;
  const brand = r.Brand;
  const weight = r["Weight(Kg)"] || 0;

  // Track Outbound (Export)
  if (exp !== "UNKNOWN") {
    if (!massBalance[exp]) massBalance[exp] = {};
    if (!massBalance[exp][brand]) massBalance[exp][brand] = { imp: 0, exp: 0 };
    massBalance[exp][brand].exp += weight;
  }

  // Track Inbound (Import)
  if (imp !== "UNKNOWN") {
    if (!massBalance[imp]) massBalance[imp] = {};
    if (!massBalance[imp][brand]) massBalance[imp][brand] = { imp: 0, exp: 0 };
    massBalance[imp][brand].imp += weight;
  }
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
    selfTradeData: finalSelfTradeData,
    entityStats: entityStats || {}, // Ensure this is never null
    routeIntel: corridors || {},   // Fallback for Map tab
    brandBaselines: brandBaselines || {},
hsAgg: hsAgg || {},           
  massBalance: massBalance || {},
    rings: rings || [],
    cycles: cycles || [],
    fraudProbability: fraudProb || 0
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
      
      {/* ✅ CONDITIONAL UI STARTS HERE */}
{data.length > 0 && (
  <main className="max-w-7xl mx-auto p-8">

    {/* ✅ GLOBAL HEADER */}
    <div className="mb-6 bg-black text-white p-4 rounded-2xl">
      <div className="text-sm">High Risk: {globalIntel.high}</div>
      <div className="text-sm">Medium Risk: {globalIntel.medium}</div>
      <div className="text-sm">Entities: {globalIntel.total}</div>
    </div>
    {/* TAB BUTTONS */}
    <div className="flex flex-wrap gap-2 mb-10 bg-slate-200 p-2 rounded-3xl shadow-inner overflow-x-auto border-2 border-slate-300">
      <TabBtn active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} label="Shipment Ledger" />
      <TabBtn active={activeTab === 'ers'} onClick={() => setActiveTab('ers')} label="ERS Score" />
      <TabBtn active={activeTab === 'networkGraph'} onClick={() => setActiveTab('networkGraph')} label="Trade Network" />
      <TabBtn active={activeTab === 'mass'} onClick={() => setActiveTab('mass')} label="Mass Balance" />
      <TabBtn active={activeTab === 'self'} onClick={() => setActiveTab('self')} label="Self Trade" />
      <TabBtn active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} label="Financial" />
      <TabBtn active={activeTab === 'map'} onClick={() => setActiveTab('map')} label="Map" />
      <TabBtn active={activeTab === 'heat'} onClick={() => setActiveTab('heat')} label="Heatmap" />
      <TabBtn active={activeTab === 'hs'} onClick={() => setActiveTab('hs')} label="HS" />
      <TabBtn active={activeTab === 'fraud'} onClick={() => setActiveTab('fraud')} label="Fraud" />
      <TabBtn active={activeTab === 'final'} onClick={() => setActiveTab('final')} label="AI" />
      <TabBtn active={activeTab === 'guide'} onClick={() => setActiveTab('guide')} label="Guide" />
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
                    title={`
Risk Score: ${totalRisk.toFixed(2)}

Breakdown:
Self: ${sScore}
HS: ${hScore}
Price: ${pScore}
Density: ${dScore}

Interpretation:
${totalRisk > 0.7 ? "HIGH RISK" : totalRisk > 0.4 ? "MEDIUM RISK" : "LOW RISK"}
`}
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
{activeTab === "final" && (
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
  <ERSPanel
    data={data}
    stats={stats}
    ersData={ersData}
    mastermindData={mastermindData}
    onSelectEntity={setSelectedEntity}
  />
)}

    {/* INVESTIGATION PANEL */}
    {selectedEntity && (
      <EntityInvestigation
        entity={selectedEntity}
        data={data}
        stats={stats}
        fraudStats={fraudStats}
        onSelectEntity={(e) => setSelectedEntity(e)}
      />
    )}

    {/* AI FORENSIC SUMMARY */}
    <div className="bg-blue-50 p-8 rounded-[2.5rem] border-4 border-blue-900 mt-10">
      <div className="flex items-center gap-3 mb-4 text-blue-900">
        <Brain size={32} />
        <h2 className="text-2xl font-black uppercase italic">
          AI Forensic Intelligence
        </h2>
      </div>
      <div className="text-blue-900 font-bold">
{generateNarrative(stats, fraudStats, ersData || {})}
      </div>
    </div>

return (
    <>
      {/* ✅ MAIN CONDITIONAL WRAPPER */}
      {data.length > 0 && (
        <main className="max-w-7xl mx-auto p-8">

          {/* ✅ GLOBAL HEADER */}
          <div className="mb-6 bg-black text-white p-6 rounded-2xl flex justify-between items-center shadow-2xl border-b-4 border-slate-800">
            <div className="flex gap-8">
              <div>
                <div className="text-[10px] uppercase font-black opacity-50">High Risk</div>
                <div className="text-xl font-black text-red-500">{globalIntel.high}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black opacity-50">Medium Risk</div>
                <div className="text-xl font-black text-orange-400">{globalIntel.medium}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black opacity-50">Total Entities</div>
                <div className="text-xl font-black">{globalIntel.total}</div>
              </div>
            </div>
            <div className="font-black italic tracking-tighter text-2xl">TRADESHIELD <span className="text-blue-500">AI</span></div>
          </div>

          {/* ✅ NAVIGATION TABS */}
          <div className="flex flex-wrap gap-2 mb-10 bg-slate-200 p-2 rounded-3xl shadow-inner overflow-x-auto border-2 border-slate-300">
            <TabBtn active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} label="Shipment Ledger" />
            <TabBtn active={activeTab === 'ers'} onClick={() => setActiveTab('ers')} label="ERS Score" />
            <TabBtn active={activeTab === 'networkGraph'} onClick={() => setActiveTab('networkGraph')} label="Trade Network" />
            <TabBtn active={activeTab === 'mass'} onClick={() => setActiveTab('mass')} label="Mass Balance" />
            <TabBtn active={activeTab === 'self'} onClick={() => setActiveTab('self')} label="Self Trade" />
            <TabBtn active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} label="Financial" />
            <TabBtn active={activeTab === 'map'} onClick={() => setActiveTab('map')} label="Map" />
            <TabBtn active={activeTab === 'heat'} onClick={() => setActiveTab('heat')} label="Heatmap" />
            <TabBtn active={activeTab === 'hs'} onClick={() => setActiveTab('hs')} label="HS" />
            <TabBtn active={activeTab === 'fraud'} onClick={() => setActiveTab('fraud')} label="Fraud" />
            <TabBtn active={activeTab === 'final'} onClick={() => setActiveTab('final')} label="AI" />
            <TabBtn active={activeTab === 'guide'} onClick={() => setActiveTab('guide')} label="Guide" />
          </div>

          {/* ✅ TAB CONTENT LOGIC */}
          <div className="min-h-[600px]">
            
            {activeTab === "audit" && (
              <div className="animate-in fade-in space-y-6">
                <div className="bg-white rounded-[2rem] shadow-2xl border-4 border-slate-900 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-white text-[10px] font-black uppercase">
                      <tr>
                        <th className="p-5">Risk Flag</th>
                        <th className="p-5">Date</th>
                        <th className="p-5">Entity Involved</th>
                        <th className="p-5">Brand / HS</th>
                        <th className="p-5">Route</th>
                        <th className="p-5 text-right">Weight (Kg)</th>
                        <th className="p-5 text-right">Amount ($)</th>
                        <th className="p-5 text-right">Qty</th>
                        <th className="p-5 text-right">Density</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-100 text-slate-800 font-bold">
                      {filteredData.map((row, i) => (
                        <tr key={i} className={`${row._isSelf ? 'bg-red-50' : 'hover:bg-slate-50'} border-b border-slate-100 transition-colors`}>
                          <td className="p-5">
                            <div className="text-sm font-black border-b border-dotted border-slate-400 inline-block">
                               {( (row._isSelf?0.3:0) + (row._isHS?0.2:0) + (row._isPrice?0.3:0) ).toFixed(2)}
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
                          <td className="p-5 text-right font-black">{(row["Weight(Kg)"] || 0).toLocaleString()}</td>
                          <td className="p-5 text-right font-black">${(row["Amount($)"] || 0).toLocaleString()}</td>
                          <td className="p-5 text-right font-black">{row.Quantity}</td>
                          <td className="p-5 text-right font-mono text-xs">{(row["Weight(Kg)"] / (row.Quantity || 1)).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "ers" && (
              <ERSPanel data={data} stats={stats} ersData={ersData} mastermindData={mastermindData} onSelectEntity={setSelectedEntity} />
            )}

            {activeTab === "mass" && <MassBalanceTab stats={stats} />}

            {activeTab === "self" && (
              <div className="animate-in fade-in space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-700 p-6 rounded-[2rem] text-white shadow-xl border-b-4 border-red-900">
                       <div className="text-[9px] font-black uppercase opacity-80">Circular Trade Volume</div>
                       <div className="text-3xl font-black mt-1">${(stats.totalCircularVolume || 0).toLocaleString()}</div>
                    </div>
                 </div>
                 {Object.entries(stats.selfTradeData || {}).map(([entity, d]) => (
                    <div key={entity} className="bg-white border-4 border-slate-900 rounded-[2.5rem] overflow-hidden shadow-xl p-8">
                       <h3 className="font-black text-xl uppercase">{entity}</h3>
                       <div className="text-4xl font-black text-red-700">${d.amount.toLocaleString()}</div>
                    </div>
                 ))}
              </div>
            )}

            {activeTab === "finance" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-100 p-4 rounded-xl">
                    <div className="text-sm text-slate-500">Median Price</div>
                    <div className="text-xl font-bold">${fin.avgPrice?.toFixed(2)}</div>
                  </div>
                  <div className="bg-red-100 p-4 rounded-xl">
                    <div className="text-sm text-red-600">Tax Loss Est.</div>
                    <div className="text-xl font-bold">${fin.taxLoss.toLocaleString()}</div>
                  </div>
                </div>
                {fin.anomalies.slice(0, 10).map((a, i) => (
                  <div key={i} className="border p-4 rounded-2xl bg-red-50 border-red-100">
                    <div className="font-black uppercase">{a.entity}</div>
                    <div className="text-sm text-red-600 font-bold">{a.reason}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "map" && (
              <div className="bg-slate-900 p-12 rounded-[4rem] text-white animate-in fade-in">
                {Object.entries(stats.routeIntel || {}).map(([route, d]) => (
                  <div key={route} className="p-6 bg-slate-800 rounded-3xl border-2 border-slate-700 flex justify-between mb-4">
                    <div className="text-2xl font-black text-blue-400">{route}</div>
                    <div className="text-right font-black">${(d.amount || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "networkGraph" && (
              <div className="bg-white p-10 rounded-3xl border-4 border-slate-900 shadow-xl">
                <NetworkGraph data={data} fraudStats={fraudStats} rings={intel.rings} />
              </div>
            )}

            {activeTab === "guide" && <GuideView />}
            
            {activeTab === "final" && (
              <div className="bg-white p-8 rounded-2xl shadow border-4 border-slate-900">
                <h2 className="text-2xl font-black mb-4">AI Intelligence Summary</h2>
                <pre className="whitespace-pre-wrap text-slate-700 font-bold leading-relaxed">{narrative}</pre>
              </div>
            )}

          </div>

          {/* ✅ GLOBAL OVERLAYS (Outside Tab logic but inside Main) */}
          {selectedEntity && (
            <EntityInvestigation
              entity={selectedEntity}
              data={data}
              stats={stats}
              fraudStats={fraudStats}
              onSelectEntity={(e) => setSelectedEntity(e)}
            />
          )}

          {/* METHODOLOGY FOOTER */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 border-t-2 border-slate-200 pt-8 pb-20">
            <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Forensic ERS</h4>
              <p className="text-xs text-slate-600">Weighted risk index (0-100) aggregating circular trade and price deviation.</p>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">System BrandOrb</h4>
              <p className="text-xs text-slate-600">Visualizing trade anomalies via light-grey corporate aesthetic.</p>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Legal Warning</h4>
              <p className="text-xs text-slate-600">Data flagged here indicates high probability of illicit trade patterns.</p>
            </div>
          </div>

        </main>
      )}
    </>
  );
}

// --- SHARED COMPONENTS (OUTSIDE DASHBOARD FUNCTION) ---

function TabBtn({ active, onClick, label }) {
  return (
    <button 
      onClick={onClick} 
      className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-tight transition-all shrink-0 
      ${active ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-800 hover:bg-slate-300'}`}
    >
      {label}
    </button>
  );
}

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

function GuideView() {
  return (
    <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-slate-900">
      <h2 className="text-3xl font-black uppercase mb-10 border-b-8 border-blue-600 w-fit">Audit Logic</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-200">
           <h4 className="text-xl font-black uppercase mb-2">Circular Trade</h4>
           <code className="bg-blue-600 text-white px-2 py-1 rounded text-xs mb-4 block w-fit">Exporter === Importer</code>
           <p className="text-sm font-bold text-slate-700">Detects round-tripping fraud and money laundering loops.</p>
        </div>
        <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-200">
           <h4 className="text-xl font-black uppercase mb-2">Price Anomaly</h4>
           <code className="bg-red-600 text-white px-2 py-1 rounded text-xs mb-4 block w-fit">±30% Median Dev</code>
           <p className="text-sm font-bold text-slate-700">Flags potential over/under invoicing for tax evasion.</p>
        </div>
      </div>
    </div>
  );
}
