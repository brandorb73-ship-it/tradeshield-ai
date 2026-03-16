import { Sankey, Tooltip } from "recharts";

export default function TradeSankey({data}){

const nodes=[];
const links=[];

const entityIndex={};

data.forEach(r=>{

if(!entityIndex[r.Exporter]){
entityIndex[r.Exporter]=nodes.length;
nodes.push({name:r.Exporter});
}

if(!entityIndex[r.Importer]){
entityIndex[r.Importer]=nodes.length;
nodes.push({name:r.Importer});
}

links.push({
source:entityIndex[r.Exporter],
target:entityIndex[r.Importer],
value:parseFloat(r["Weight(Kg)"])||1
});

});

return(

<Sankey
width={900}
height={500}
data={{nodes,links}}
nodePadding={40}
linkCurvature={0.5}
>

<Tooltip/>

</Sankey>

);

}
