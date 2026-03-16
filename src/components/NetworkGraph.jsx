import React,{useEffect, useRef} from "react";
import * as d3 from "d3";

export default function NetworkGraph({data}){

const ref=useRef();

useEffect(()=>{

const nodes={};
const links=[];

data.forEach(r=>{

nodes[r.Exporter]={id:r.Exporter};
nodes[r.Importer]={id:r.Importer};

links.push({
source:r.Exporter,
target:r.Importer
});

});

const nodeList=Object.values(nodes);

const svg=d3.select(ref.current);

svg.selectAll("*").remove();

const simulation=d3.forceSimulation(nodeList)
.force("link",d3.forceLink(links).id(d=>d.id).distance(120))
.force("charge",d3.forceManyBody().strength(-200))
.force("center",d3.forceCenter(400,300));

const link=svg.append("g")
.selectAll("line")
.data(links)
.enter()
.append("line")
.attr("stroke","#999");

const node=svg.append("g")
.selectAll("circle")
.data(nodeList)
.enter()
.append("circle")
.attr("r",8)
.attr("fill","#2563eb");

simulation.on("tick",()=>{

link
.attr("x1",d=>d.source.x)
.attr("y1",d=>d.source.y)
.attr("x2",d=>d.target.x)
.attr("y2",d=>d.target.y);

node
.attr("cx",d=>d.x)
.attr("cy",d=>d.y);

});

},[data]);

return(

<div>

<h2 className="text-2xl font-black mb-4">Trade Network</h2>

<svg ref={ref} width="800" height="600"/>

</div>

);

}
