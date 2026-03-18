export function financialAnalysis(data){

/* -----------------------------
Invoice Clustering
-----------------------------*/
const clusters = {};

data.forEach(r=>{

const key = `${r.Exporter}-${r["Unit Price($)"]}`;

if(!clusters[key]) clusters[key]=[];

clusters[key].push(r);

});

/* -----------------------------
Value Anomalies
-----------------------------*/
const prices = data.map(d=>parseFloat(d["Unit Price($)"]||0));

const avg =
prices.reduce((a,b)=>a+b,0)/prices.length;

const anomalies = data.filter(d=>{

const p=parseFloat(d["Unit Price($)"]||0);

return p > avg*1.5 || p < avg*0.5;

});

/* -----------------------------
Tax Loss Estimation
-----------------------------*/
const taxLoss = anomalies.reduce((sum,r)=>{

const expected = avg;
const actual = parseFloat(r["Unit Price($)"]);

return sum + Math.abs(expected-actual) * r.Quantity;

},0);

return {
clusters,
anomalies,
taxLoss: Math.round(taxLoss)
};

}
