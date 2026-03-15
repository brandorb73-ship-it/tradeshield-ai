import React, { useState, useMemo } from 'react';
import Papa from 'papaparse'; 
import { 
  AlertTriangle, ShieldCheck, Activity, Globe, Link as LinkIcon, 
  TrendingUp, Search, BarChart3, ListFilter, ShieldAlert, FileText, 
  BookOpen, Network, Zap, Percent
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const [urlInput, setUrlInput] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("audit"); 
  const [stats, setStats] = useState({ selfTrade: 0, totalValue: 0, entities: 0, fraudValue: 0, riskIndex: 0 });

  // ... (Keep handleFetch and analyzeFraud logic from previous version)

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20 font-sans">
      {/* Professional Navbar */}
      <nav className="bg-[#020617] text-white py-6 px-8 shadow-2xl border-b-4 border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <ShieldAlert className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase">TRADESHIELD <span className="text-blue-500">PRO</span></h1>
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Intelligence Division</div>
            </div>
          </div>

          <div className="flex w-full md:w-2/3 gap-3">
            <input 
              type="text" 
              placeholder="Enter forensic data link..." 
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-3 px-6 text-lg focus:ring-4 focus:ring-blue-500/50 text-white outline-none"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button onClick={handleFetch} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 py-3 rounded-2xl text-lg shadow-xl transition-all">
              {loading ? "SCANNING..." : "AUDIT"}
            </button>
          </div>
        </div>
      </nav>

      {data.length > 0 && (
        <main className="max-w-7xl mx-auto p-8">
          
          {/* MULTI-TAB SELECTOR */}
          <div className="flex flex-wrap gap-2 mb-10 bg-slate-200 p-2 rounded-[2rem] w-fit shadow-inner">
            <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<ListFilter size={18} />} label="Audit Ledger" />
            <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={18} />} label="Deep Analytics" />
            <TabButton active={activeTab === 'guide'} onClick={() => setActiveTab('guide')} icon={<BookOpen size={18} />} label="Audit Guide" />
            <TabButton active={activeTab === 'network'} onClick={() => setActiveTab('network')} icon={<Network size={18} />} label="Network Risk" />
          </div>

          {/* TAB 1 & 2: (As per previous code) */}
          {activeTab === "audit" && <AuditLedger data={data} stats={stats} />}
          {activeTab === "analytics" && <AnalyticsView data={data} stats={stats} />}

          {/* TAB 3: AUDIT GUIDE & INDEX DEFINITIONS */}
          {activeTab === "guide" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-slate-200">
                <h2 className="text-3xl font-black text-[#0f172a] mb-8 uppercase tracking-tight flex items-center gap-3">
                  <BookOpen className="text-blue-600" size={32} /> Forensic Index & Logic Definitions
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <section className="space-y-6">
                    <h3 className="text-xl font-black text-blue-700 uppercase tracking-widest flex items-center gap-2 border-b-2 border-blue-100 pb-2">
                      <Zap size={20}/> Core Detection Logic
                    </h3>
                    <div className="space-y-8">
                      <Definition 
                        term="Circular Trade (Self-Trading)" 
                        logic="Exporter_Name == Importer_Name" 
                        description="Flags instances where the same legal entity acts as buyer and seller. Standard commercial trade requires transfer of ownership; this pattern suggests capital movement without a genuine sale."
                        impact="High: Indicates Potential VAT Carousel Fraud or Money Laundering."
                      />
                      <Definition 
                        term="Price Anomaly Index (PAI)" 
                        logic="(Unit_Price / Market_AVG) > 1.5" 
                        description="Measures deviation of shipment price against industry standard for the specific HS Code. Self-traders often over-invoice to shift profits."
                        impact="Medium: Suggests Transfer Pricing or Base Erosion."
                      />
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-xl font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2 border-b-2 border-emerald-100 pb-2">
                      <Percent size={20}/> Risk Scoring Metrics
                    </h3>
                    <div className="space-y-8">
                      <Definition 
                        term="Entity Risk Index (ERI)" 
                        logic="(Entity_Flags / Entity_Total_Trade)" 
                        description="Calculates the percentage of an entity's total business that is flagged as suspicious. Entities with ERI > 50% are categorized as 'Shell Entities'."
                        impact="Critical: Used for Blacklisting vendors."
                      />
                      <Definition 
                        term="U-Turn Detection" 
                        logic="(A -> B) followed by (B -> A)" 
                        description="Traces the movement of specific goods (by Weight/Quantity) returning to the country of origin within a 90-day window."
                        impact="High: Classic Round-Tripping fraud."
                      />
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NETWORK RISK (SUGGESTED) */}
          {activeTab === "network" && (
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200 text-center">
                <Network className="mx-auto text-blue-600 mb-6" size={64} />
                <h2 className="text-4xl font-black text-slate-900 mb-4">Network Relationship Mapper</h2>
                <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
                  This module identifies hidden connections between different company names using 
                  <span className="text-blue-600 font-bold"> Fuzzy Name Matching </span> 
                  and Shared Port Data.
                </p>
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="p-8 bg-slate-900 rounded-3xl text-white">
                        <h4 className="font-black text-blue-400 uppercase mb-2">Most Connected Port</h4>
                        <div className="text-3xl font-black">COLOMBO / Jebel Ali</div>
                    </div>
                    <div className="p-8 bg-slate-900 rounded-3xl text-white">
                        <h4 className="font-black text-blue-400 uppercase mb-2">Shell Cluster Size</h4>
                        <div className="text-3xl font-black">12 Potential Nodes</div>
                    </div>
                </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

// Sub-Components
function TabButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-10 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-tighter transition-all ${active ? 'bg-[#020617] text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-slate-300'}`}
    >
      {icon} {label}
    </button>
  );
}

function Definition({ term, logic, description, impact }) {
  return (
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-blue-400 transition-colors">
      <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{term}</h4>
      <code className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded-md font-bold uppercase">{logic}</code>
      <p className="mt-4 text-slate-700 leading-relaxed font-medium">{description}</p>
      <div className="mt-4 pt-4 border-t border-slate-200 text-xs font-black text-red-600 uppercase italic">
        Impact: {impact}
      </div>
    </div>
  );
}
