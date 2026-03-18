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

const zoom=d3.zoom()
.scaleExtent([0.3,4])
.on("zoom",(event)=>{
container.attr("transform",event.transform);
});

svg.call(zoom);

/* ----------------------------
BUILD NODE + EDGE STRUCTURE
-----------------------------*/

const nodeMap={};
const links=[];

data.forEach(r=>{

const exp=r.Exporter;
const imp=r.Importer;

if(!nodeMap[exp]) nodeMap[exp]={id:exp,value:0};
if(!nodeMap[imp]) nodeMap[imp]={id:imp,value:0};

nodeMap[exp].value+=parseFloat(r["Amount($)"]||0);

links.push({
source:exp,
target:imp,
value:parseFloat(r["Amount($)"]||0)
});

});

const nodes=Object.values(nodeMap);

/* ----------------------------
CLUSTER BY COUNTRY
-----------------------------*/

nodes.forEach(n=>{

const rows=data.filter(d=>d.Exporter===n.id);

if(rows.length){

n.cluster=rows[0]["Origin Country"];

}else{

n.cluster="Unknown";

}

});

/* ----------------------------
RISK SCORING
-----------------------------*/

nodes.forEach(n=>{

n.risk=0;

if(fraudStats?.vat?.includes(n.id)) n.risk+=3;
if(fraudStats?.phantom?.includes(n.id)) n.risk+=4;
if(fraudStats?.price?.includes(n.id)) n.risk+=2;

});

/* ----------------------------
FORCE SIMULATION
-----------------------------*/

const simulation=d3.forceSimulation(nodes)
.force("link",d3.forceLink(links).id(d=>d.id).distance(150))
.force("charge",d3.forceManyBody().strength(-350))
.force("center",d3.forceCenter(width/2,height/2))
.force("collision",d3.forceCollide().radius(d=>nodeSize(d)+5));

/* ----------------------------
LINKS
-----------------------------*/

const link=container.append("g")
.selectAll("line")
.data(links)
.enter()
.append("line")
.attr("stroke","#374151")
.attr("stroke-width",1.5)
.attr("stroke-opacity",0.6)
.attr("stroke-width",d=>Math.sqrt(d.value)/20)

/* ----------------------------
NODE SIZE
-----------------------------*/

function nodeSize(d){

return Math.max(8,Math.sqrt(d.value)/80);

}

/* ----------------------------
NODE COLOR BY RISK
-----------------------------*/

function nodeColor(d){

if(d.risk>=6) return "#dc2626";
if(d.risk>=3) return "#f59e0b";

return "#2563eb";

}

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
.call(
d3.drag()
.on("start",dragstarted)
.on("drag",dragged)
.on("end",dragended)
);

/* ----------------------------
NODE LABELS
-----------------------------*/

const label=container.append("g")
.selectAll("text")
.data(nodes)
.enter()
.append("text")
.text(d=>d.id)
.attr("font-size","11px")
.attr("dx",10)
.attr("dy",".35em")
.attr("fill","#111");

/* ----------------------------
TOOLTIP
-----------------------------*/

const tooltip=d3.select("body")
.append("div")
.style("position","absolute")
.style("background","#020617")
.style("color","white")
.style("padding","8px")
.style("border-radius","8px")
.style("font-size","12px")
.style("opacity",0);

node
.on("mouseover",(event,d)=>{

tooltip
.style("opacity",1)
.html(`
<strong>${d.id}</strong><br/>
Trade Volume: $${Math.round(d.value)}<br/>
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

  <div className="mt-4 text-sm text-slate-600">

Graph Interpretation

• Node size = total trade value  
• Node color = risk score  
• Link thickness = trade volume  
• Clusters = trade hubs  

Investigators should focus on:

Large red nodes connected to multiple clusters.

</div>
/* ----------------------------
TICK UPDATE
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
DRAG EVENTS
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

},[data,fraudStats]);

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

</div>

);

}
