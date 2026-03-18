import React from "react";

const Section = ({ title, color, data, evidence, reason }) => {
  if (!data?.length) return null;

  return (
    <>
      {data.map((e, i) => (
        <div key={i} className="mb-4">
          <div className={`font-bold ${color}`}>{e}</div>
          <div className="text-sm text-slate-600">
            Evidence: {evidence} <br />
            Reason: {reason}
          </div>
        </div>
      ))}
    </>
  );
};

export default function FraudIntelligenceCard({ stats, fraudStats }) {
  return (
    <div className="space-y-6">

      {/* FRAUD PROBABILITY */}
      <div className="bg-black text-white p-4 rounded">
        <h3 className="font-bold">Fraud Probability Engine</h3>
        <div className="text-3xl font-black text-red-400">
          {stats?.fraudProbability || 0}%
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

        {/* VAT */}
        <div className="bg-white p-6 rounded-2xl border shadow">
          <h3 className="font-bold text-xl mb-4">
            Fraud Signals
          </h3>

          <Section
            title="VAT"
            color="text-red-700"
            data={fraudStats?.vat}
            evidence="Circular trade loop detected"
            reason="Exporter also receives same product"
          />

          <Section
            title="Phantom"
            color="text-purple-700"
            data={fraudStats?.phantom}
            evidence="High value, low shipment count"
            reason="Trade laundering pattern"
          />

          <Section
            title="U-Turn"
            color="text-yellow-700"
            data={fraudStats?.uturn}
            evidence="Goods return to origin"
            reason="Circular laundering route"
          />

          <Section
            title="Price"
            color="text-blue-700"
            data={fraudStats?.price}
            evidence="Price deviation"
            reason="Customs value manipulation"
          />

        </div>
      </div>

      {/* AI SUMMARY (READY HOOK) */}
      <div className="bg-slate-900 text-white p-4 rounded">
        <h3 className="font-bold mb-2">AI Risk Summary</h3>
        <p className="text-sm text-slate-300">
          High probability of structured trade fraud involving circular routing,
          abnormal pricing, and low-volume high-value transactions across multiple entities.
        </p>
      </div>

    </div>
  );
}
