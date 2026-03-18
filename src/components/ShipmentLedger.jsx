import React, { useMemo, useState } from "react";

export default function ShipmentLedger({ data = [] }) {

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  // -----------------------------
  // FILTER + SEARCH LOGIC
  // -----------------------------
  const filtered = useMemo(() => {

    return data.filter(r => {

      const s = search.toLowerCase();

      const matchesSearch =
        (r.Exporter || "").toLowerCase().includes(s) ||
        (r.Importer || "").toLowerCase().includes(s) ||
        (r.Brand || "").toLowerCase().includes(s) ||
        (r["Origin Country"] || "").toLowerCase().includes(s) ||
        (r["Destination Country"] || "").toLowerCase().includes(s);

      const matchesFilter =
        filter === "ALL"
          ? true
          : (r.fraudLevel || "LOW") === filter;

      return matchesSearch && matchesFilter;

    });

  }, [data, search, filter]);

  // -----------------------------
  // TOTALS
  // -----------------------------
  const totalWeight = filtered.reduce(
    (a, b) => a + (parseFloat(b["Weight(Kg)"]) || 0),
    0
  );

  const totalValue = filtered.reduce(
    (a, b) => a + (parseFloat(b["Amount($)"]) || 0),
    0
  );

  // -----------------------------
  // UNIT PRICE SAFE CALC
  // -----------------------------
  const getUnitPrice = (r) => {
    if (r["Unit Price($)"]) return Number(r["Unit Price($)"]).toFixed(2);

    const weight = Number(r["Weight(Kg)"]) || 0;
    const amt = Number(r["Amount($)"]) || 0;

    if (weight > 0) return (amt / weight).toFixed(2);

    return "-";
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (

    <div className="space-y-6">

      <div className="flex justify-between items-center">

        <h2 className="text-xl font-bold">Shipment Ledger</h2>

        <input
          type="text"
          placeholder="Search exporter, importer, brand..."
          className="border rounded-lg px-3 py-2"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

      </div>

      {/* ✅ FILTER DROPDOWN */}
      <div className="flex gap-4 items-center">

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border px-3 py-2 rounded-lg"
        >
          <option value="ALL">All Risk</option>
          <option value="HIGH">High Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="LOW">Low Risk</option>
        </select>

      </div>

      <div className="text-sm text-slate-600 flex gap-6">

        <div>Total Shipments: <b>{filtered.length}</b></div>

        <div>Total Weight: <b>{totalWeight.toLocaleString()} kg</b></div>

        <div>Total Value: <b>${totalValue.toLocaleString()}</b></div>

      </div>

      <div className="overflow-x-auto border rounded-xl">

        <table className="table-auto w-full text-sm">

          <thead className="bg-slate-100">

            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Brand</th>
              <th className="px-3 py-2">Exporter</th>
              <th className="px-3 py-2">Importer</th>
              <th className="px-3 py-2">Origin</th>
              <th className="px-3 py-2">Destination</th>
              <th className="px-3 py-2">Weight (Kg)</th>
              <th className="px-3 py-2">Amount ($)</th>
              <th className="px-3 py-2">Unit Price</th>
              <th className="px-3 py-2">Fraud Score</th>
              <th className="px-3 py-2">Risk</th>
              <th className="px-3 py-2">Reasons</th>
            </tr>

          </thead>

          <tbody>

            {filtered.slice(0, 500).map((r, i) => {

              const score = r.fraudScore || 0;

              const rowColor =
                score > 70
                  ? "bg-red-100"
                  : score > 40
                  ? "bg-yellow-100"
                  : "bg-green-50";

              return (

                <tr key={i} className={`border-t ${rowColor}`}>

                  <td className="px-3 py-2">{r.Date}</td>
                  <td className="px-3 py-2">{r.Brand}</td>
                  <td className="px-3 py-2">{r.Exporter}</td>
                  <td className="px-3 py-2">{r.Importer}</td>
                  <td className="px-3 py-2">{r["Origin Country"]}</td>
                  <td className="px-3 py-2">{r["Destination Country"]}</td>

                  <td className="px-3 py-2">
                    {parseFloat(r["Weight(Kg)"] || 0).toLocaleString()}
                  </td>

                  <td className="px-3 py-2">
                    ${parseFloat(r["Amount($)"] || 0).toLocaleString()}
                  </td>

                  <td className="px-3 py-2">
                    {getUnitPrice(r)}
                  </td>

                  <td className="px-3 py-2 font-bold">
                    {score}
                  </td>

                  <td className="px-3 py-2 font-bold">
                    {r.fraudLevel || "LOW"}
                  </td>

                  <td className="px-3 py-2 text-xs">
                    {(r.reasons || []).join(", ")}
                  </td>

                </tr>

              );

            })}

          </tbody>

        </table>

      </div>

    </div>
  );

}
