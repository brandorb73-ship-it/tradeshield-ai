import React from "react";

export default function EntityInvestigation({entity,data,shellScores,fraudStats}){

if(!entity) return null;

const rows=data.filter(r=>r.Exporter===entity || r.Importer===entity);

const totalValue=rows.reduce((a,b)=>a+parseFloat(b["Amount($)"]||0),0);

const partners=new Set(rows.map(r=>r.Importer));

return(

<div className="bg-white p-6 rounded-2xl border shadow">

<h2 className="text-2xl font-bold mb-4">
Entity Investigation: {entity}
</h2>

<div className="grid grid-cols-2 gap-4">

<div>
<strong>Total Trade Value</strong>
<div>${Math.round(totalValue)}</div>
</div>

<div>
<strong>Partners</strong>
<div>{partners.size}</div>
</div>

<div>
<strong>Shell Score</strong>
<div>{shellScores[entity] || 0}</div>
</div>

<div>
<strong>VAT Ring</strong>
<div>{fraudStats.vat.includes(entity) ? "YES" : "NO"}</div>
</div>

</div>

</div>

);

}
