import React,{useState} from "react";

export default function ShipmentLedger({data}){

const [search,setSearch]=useState("");

const filtered=data.filter(r=>
   Object.values(r)
   .join(" ")
   .toLowerCase()
   .includes(search.toLowerCase())
);

return(

<div className="bg-white p-8 rounded-3xl shadow-xl border-2">

<h2 className="text-2xl font-black mb-4">Shipment Ledger</h2>

<input
className="border p-2 w-full mb-6"
placeholder="Search entity, brand, country..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

<table className="w-full text-sm">

<thead className="bg-slate-900 text-white">

<tr>
<th>Date</th>
<th>Exporter</th>
<th>Importer</th>
<th>Brand</th>
<th>HS</th>
<th>Route</th>
<th>Weight</th>
<th>Amount</th>
<th>Flags</th>
</tr>

</thead>

<tbody>

{filtered.map((r,i)=>{

const flags=[];

if(r._isSelf) flags.push("Circular");
if(r._priceAnomaly) flags.push("Price");
if(r._hsMismatch) flags.push("HS");

return(

<tr key={i} className="border-b">

<td>{r.Date}</td>
<td>{r.Exporter}</td>
<td>{r.Importer}</td>
<td>{r.Brand}</td>
<td>{r["HS Code"]}</td>
<td>{r["Origin Country"]} → {r["Destination Country"]}</td>
<td>{r["Weight(Kg)"]}</td>
<td>${r["Amount($)"]}</td>

<td className="text-red-600 font-bold">
{flags.join(", ")}
</td>

</tr>

);

})}

</tbody>

</table>

</div>

);

}
