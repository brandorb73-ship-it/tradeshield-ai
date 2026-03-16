import React,{useState} from "react";

export default function ShipmentTimeline({data}){

const [index,setIndex]=useState(0);

if(!data.length) return null;

const row=data[index];

return(

<div className="bg-white p-6 rounded-2xl shadow">

<h3 className="text-xl font-bold mb-4">
Shipment Timeline Replay
</h3>

<div>

Date: {row.Date}

</div>

<div>

Exporter: {row.Exporter}

</div>

<div>

Importer: {row.Importer}

</div>

<div>

Weight: {row["Weight(Kg)"]}

</div>

<button
className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
onClick={()=>setIndex((index+1)%data.length)}
>

Next Shipment

</button>

</div>

);

}
