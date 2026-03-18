export function detectSmugglingRoutes(data){

const routes={};

data.forEach(r=>{

const route =
`${r["Origin Country"]} → ${r.Exporter} → ${r.Importer} → ${r["Destination Country"]}`;

if(!routes[route]){

routes[route]={
count:0,
value:0,
weight:0,
prices:[]
};

}

routes[route].count++;

routes[route].value+=parseFloat(r["Amount($)"]||0);

routes[route].weight+=parseFloat(r["Weight(Kg)"]||0);

routes[route].prices.push(parseFloat(r["Unit Price($)"]||0));

});

const suspicious=[];

Object.entries(routes).forEach(([route,r])=>{

const avgPrice =
r.prices.reduce((a,b)=>a+b,0)/r.prices.length;

const density=r.value/(r.weight+1);

if(
r.count>3 &&
avgPrice>20 &&
density>50
){

suspicious.push({
route,
count:r.count,
value:r.value,
avgPrice:avgPrice.toFixed(2)
});

}

});

return suspicious;

}
