export function detectTobaccoFraud(rows){

const signals={
taxCarousel:[],
transshipment:[],
ghostExports:[],
priceDumping:[]
};

const parse=v=>parseFloat(v)||0;

const brandPrices={};

rows.forEach(r=>{

const price=r["Unit Price($)"]
? parse(r["Unit Price($)"])
: parse(r["Amount($)"])/(parse(r["Weight(Kg)"])||1);

if(!brandPrices[r.Brand]) brandPrices[r.Brand]=[];
brandPrices[r.Brand].push(price);

});

const avg={};

Object.keys(brandPrices).forEach(b=>{
avg[b]=brandPrices[b].reduce((a,b)=>a+b,0)/brandPrices[b].length;
});

rows.forEach(r=>{

const exporter=r.Exporter;
const importer=r.Importer;

const price=r["Unit Price($)"]
? parse(r["Unit Price($)"])
: parse(r["Amount($)"])/(parse(r["Weight(Kg)"])||1);

const route=`${r["Origin Country"]}->${r["Destination Country"]}`;

if(exporter===importer){

signals.taxCarousel.push({
entity:exporter,
shipment:r
});

}

if(route.includes("UAE") || route.includes("Cyprus")){

signals.transshipment.push({
route,
shipment:r
});

}

if(price < avg[r.Brand]*0.5){

signals.priceDumping.push({
brand:r.Brand,
price
});

}

});

return signals;

}
