export function detectSmugglingClusters(data){

const clusters={};

data.forEach(r=>{

const region=r["Origin Country"];

if(!clusters[region]){

clusters[region]={
entities:new Set(),
weight:0,
value:0
};

}

clusters[region].entities.add(r.Exporter);

clusters[region].weight+=parseFloat(r["Weight(Kg)"]||0);

clusters[region].value+=parseFloat(r["Amount($)"]||0);

});

return clusters;

}
