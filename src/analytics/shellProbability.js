export function calculateShellScore(data){

const entityStats={};

data.forEach(r=>{

const e=r.Exporter;

if(!entityStats[e]){

entityStats[e]={
transactions:0,
totalValue:0,
partners:new Set(),
countries:new Set()
};

}

entityStats[e].transactions++;

entityStats[e].totalValue+=parseFloat(r["Amount($)"]||0);

entityStats[e].partners.add(r.Importer);
entityStats[e].countries.add(r["Destination Country"]);

});

const results={};

Object.entries(entityStats).forEach(([entity,s])=>{

let score=0;

if(s.transactions<3) score+=30;

if(s.totalValue>1000000) score+=25;

if(s.partners.size===1) score+=25;

if(s.countries.size>3) score+=20;

results[entity]=Math.min(score,100);

});

return results;

}
