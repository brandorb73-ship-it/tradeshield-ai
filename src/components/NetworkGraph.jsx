import React,{useEffect,useRef} from "react";
import * as d3 from "d3";

export default function NetworkGraph({data,fraudStats}){

const ref=useRef();

useEffect(()=>{

if(!data || data.length===0) return;

const width=1000;
const height=700;

const svg=d3.select(ref.current);
svg.selectAll("*").remove();

const container=svg
.attr("viewBox",[0,0,width,height])
.append("g");

/* ----------------------------
ZOOM
-----------------------------*/
const zoom=d3.zoom()
.scaleExtent([0.3,4])
.on("zoom",(event)=>{
container.attr("transform",event.transform);
});

svg.call(zoom);

/* ----------------------------
BUILD NODE + EDGE
-----------------------------*/
const nodeMap={};
const links=[];

data.forEach(r=>{

const exp=r.Exporter || "Unknown";
const imp=r.Importer || "Unknown";

if(!nodeMap[exp]) nodeMap[exp]={id:exp,value:0,transactions:0};
if(!nodeMap[imp]) nodeMap[imp]={id:imp,value:0,transactions:0};

const amt=parseFloat(r["Amount($)"]||0);

nodeMap[exp].value+=amt;
nodeMap[exp].transactions+=1;

links.push({
source:exp,
target:imp,
value:amt
});

});

const nodes=Object.values(nodeMap);

/* ----------------------------
CLUSTER (BY COUNTRY)
-----------------------------*/
nodes.forEach(n=>{
const row=data.find(d=>d.Exporter===n.id);
n.cluster=row ? row["Origin Country"] : "Unknown";
});

/* ----------------------------
FIX FRAUD LOOKUPS (IMPORTANT)
-----------------------------*/
const vatSet=new Set((fraudStats?.vat||[]));
const phantomSet=new Set((fraudStats?.phantom||[]));
const priceSet=new Set(
(fraudStats?.price||[]).map(p=>p.entity)
);

/* ----------------------------
RISK SCORING
-----------------------------*/
nodes.forEach(n=>{

n.risk=0;

if(vatSet.has(n.id)) n.risk+=3;
if(phantomSet.has(n.id)) n.risk+=4;
if(priceSet.has(n.id)) n.risk+=2;

});

/* ----------------------------
NODE SIZE
-----------------------------*/
function nodeSize(d){
return Math.max(10,Math.sqrt(d.value)/60);
}

/* ----------------------------
COLOR
-----------------------------*/
function nodeColor(d){
if(d.risk>=6) return "#dc2626";
if(d.risk>=3) return "#f59e0b";
return "#2563eb";
}

/* ----------------------------
FORCE SIMULATION
-----------------------------*/
const simulation=d3.forceSimulation(nodes)
.force("link",d3.forceLink(links)
.id(d=>d.id)
.distance(120)
.strength(0.6)
)
.force("charge",d3.forceManyBody().strength(-500))
.force("center",d3.forceCenter(width/2,height/2))
.force("collision",d3.forceCollide().radius(d=>nodeSize(d)+8))
.force("cluster",d3.forceX(d=>d.cluster.charCodeAt(0)*5).strength(0.05)); // 🔥 clustering

/* ----------------------------
LINKS (DARKER + STRONGER)
-----------------------------*/
const link=container.append("g")
.selectAll("line")
.data(links)
.enter()
.append("line")
.attr("stroke","#111827")
.attr("stroke-opacity",0.8)
.attr("stroke-width",d=>Math.max(1,Math.sqrt(d.value)/15));

/* ----------------------------
NODES
-----------------------------*/
const node=container.append("g")
.selectAll("circle")
.data(nodes)
.enter()
.append("circle")
.attr("r",nodeSize)
.attr("fill",nodeColor)
.attr("stroke","#000")
.attr("stroke-width",0.5)
.call(
d3.drag()
.on("start",dragstarted)
.on("drag",dragged)
.on("end",dragended)
);

/* ----------------------------
CLICK → INVESTIGATION PANEL
-----------------------------*/
node.on("click",(event,d)=>{
window.dispatchEvent(
new CustomEvent("entitySelect",{detail:d.id})
);
});

/* ----------------------------
LABELS
-----------------------------*/
const label=container.append("g")
.selectAll("text")
.data(nodes)
.enter()
.append("text")
.text(d=>d.id)
.attr("font-size","11px")
.attr("dx",12)
.attr("dy",".35em")
.attr("fill","#000");

/* ----------------------------
TOOLTIP (ENHANCED)
-----------------------------*/
const tooltip=d3.select("body")
.append("div")
.style("position","absolute")
.style("background","#020617")
.style("color","white")
.style("padding","10px")
.style("border-radius","10px")
.style("font-size","12px")
.style("opacity",0);

node
.on("mouseover",(event,d)=>{

tooltip
.style("opacity",1)
.html(`
<strong>${d.id}</strong><br/>
Trade Value: $${Math.round(d.value).toLocaleString()}<br/>
Transactions: ${d.transactions}<br/>
Risk Score: ${d.risk}<br/>
Cluster: ${d.cluster}
`);

})
.on("mousemove",(event)=>{
tooltip
.style("left",(event.pageX+10)+"px")
.style("top",(event.pageY+10)+"px");
})
.on("mouseout",()=>{
tooltip.style("opacity",0);
});

/* ----------------------------
TICK
-----------------------------*/
simulation.on("tick",()=>{

link
.attr("x1",d=>d.source.x)
.attr("y1",d=>d.source.y)
.attr("x2",d=>d.target.x)
.attr("y2",d=>d.target.y);

node
.attr("cx",d=>d.x)
.attr("cy",d=>d.y);

label
.attr("x",d=>d.x)
.attr("y",d=>d.y);

});

/* ----------------------------
DRAG
-----------------------------*/
function dragstarted(event,d){
if(!event.active) simulation.alphaTarget(0.3).restart();
d.fx=d.x;
d.fy=d.y;
}

function dragged(event,d){
d.fx=event.x;
d.fy=event.y;
}

function dragended(event,d){
if(!event.active) simulation.alphaTarget(0);
d.fx=null;
d.fy=null;
}

/* ----------------------------
CLEANUP (IMPORTANT)
-----------------------------*/
return ()=>{
simulation.stop();
tooltip.remove();
};

},[data,fraudStats]);

/* ----------------------------
UI
-----------------------------*/
return(

<div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-slate-900">

<h2 className="text-3xl font-black mb-6">
Trade Intelligence Network
</h2>

<svg ref={ref} width="1000" height="700"/>

<div className="mt-6 text-sm font-bold">

<span className="text-blue-600">● Normal Entity</span> &nbsp;&nbsp;
<span className="text-yellow-500">● Medium Risk</span> &nbsp;&nbsp;
<span className="text-red-600">● High Risk</span>

</div>

{/* ✅ FIXED: MOVED OUTSIDE useEffect */}
<div className="mt-4 text-sm text-slate-600">

Graph Interpretation

• Node size = total trade value  
• Node color = fraud risk score  
• Link thickness = trade volume  
• Clusters = origin country grouping  

Focus on:

• Large red nodes (high-risk entities)  
• Entities bridging multiple clusters (possible laundering hubs)  
• Dense loops (circular trade / VAT fraud)

</div>

</div>

);

}
