export function detectTradeCorridors(data){

const corridors={};

data.forEach(r=>{

const key=`${r["Origin Country"]} → ${r["Destination Country"]}`;

if(!corridors[key]){

corridors[key]={
count:0,
value:0,
weight:0
};

}

corridors[key].count++;

corridors[key].value+=parseFloat(r["Amount($)"]||0);
corridors[key].weight+=parseFloat(r["Weight(Kg)"]||0);

});

return corridors;

}
