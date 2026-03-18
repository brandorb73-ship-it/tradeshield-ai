import React, { useMemo, useState } from "react";

export default function ShipmentLedger({ data = [] }) {

const [search,setSearch]=useState("");

const filtered=useMemo(()=>{

return data.filter(r=>{

const s=search.toLowerCase();

const [filter,setFilter]=useState("ALL");

return(
(r.Exporter||"").toLowerCase().includes(s) ||
(r.Importer||"").toLowerCase().includes(s) ||
(r.Brand||"").toLowerCase().includes(s) ||
(r["Origin Country"]||"").toLowerCase().includes(s) ||
(r["Destination Country"]||"").toLowerCase().includes(s)
)

})

},[data,search])

const totalWeight=filtered.reduce((a,b)=>a+(parseFloat(b["Weight(Kg)"])||0),0)
const totalValue=filtered.reduce((a,b)=>a+(parseFloat(b["Amount($)"])||0),0)

return(

<div className="space-y-6">

<div className="flex justify-between items-center">

<h2 className="text-xl font-bold">Shipment Ledger</h2>

<input
type="text"
placeholder="Search exporter, importer, brand..."
className="border rounded-lg px-3 py-2"
value={search}
onChange={e=>setSearch(e.target.value)}
/>

</div>

<div className="text-sm text-slate-600 flex gap-6">

<div>Total Shipments: <b>{filtered.length}</b></div>

<div>Total Weight: <b>{totalWeight.toLocaleString()} kg</b></div>

<div>Total Value: <b>${totalValue.toLocaleString()}</b></div>

</div>

<div className="overflow-x-auto border rounded-xl">

<table className="table-auto w-full text-sm">

<thead>

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
<th>Fraud Score</th>
<th>Risk</th>
<th>Reasons</th>

</tr>

</thead>

<tbody>

{filtered.slice(0,500).map((r,i)=>(

<tr key={i} className="border-t">

<td className="px-3 py-2">{r.Date}</td>

<td className="px-3 py-2">{r.Brand}</td>

<td className="px-3 py-2">{r.Exporter}</td>

<td className="px-3 py-2">{r.Importer}</td>

<td className="px-3 py-2">{r["Origin Country"]}</td>

<td className="px-3 py-2">{r["Destination Country"]}</td>

<td className="px-3 py-2">
{parseFloat(r["Weight(Kg)"]||0).toLocaleString()}
</td>

<td className="px-3 py-2">
${parseFloat(r["Amount($)"]||0).toLocaleString()}
</td>

<td className="px-3 py-2">
{r["Unit Price($)"]||"-"}
</td>

<td>{row.fraudScore}</td>
<td className="font-bold">{row.fraudLevel}</td>
<td className="text-xs">
{row.reasons.join(", ")}
</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

)

}
