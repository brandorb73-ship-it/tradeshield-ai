export function financialAnalysis(data){

/* -----------------------------
SAFE UNIT PRICE
-----------------------------*/
const getPrice = (r) => {

  const declared = Number(r["Unit Price($)"]);
  if (declared && declared > 0) return declared;

  const amt = Number(r["Amount($)"]) || 0;
  const weight = Number(r["Weight(Kg)"]) || 0;

  if (weight > 0) return amt / weight;

  return 0;

};

/* -----------------------------
BUILD PRICE ARRAY
-----------------------------*/
const prices = data
.map(getPrice)
.filter(p => p > 0)
.sort((a,b)=>a-b);

/* -----------------------------
MEDIAN (ROBUST)
-----------------------------*/
const median =
prices.length
? prices[Math.floor(prices.length/2)]
: 0;

/* -----------------------------
INVOICE CLUSTERING
(Group by exporter + rounded price band)
-----------------------------*/
const clusters = {};

data.forEach(r=>{

  const price = getPrice(r);
  const band = Math.round(price/5)*5; // group into bands

  const key = `${r.Exporter}-${band}`;

  if(!clusters[key]){

    clusters[key]={
      exporter:r.Exporter,
      priceBand:band,
      shipments:0,
      totalValue:0
    };

  }

  clusters[key].shipments +=1;
  clusters[key].totalValue += Number(r["Amount($)"]||0);

});

/* -----------------------------
VALUE ANOMALIES
-----------------------------*/
const anomalies = [];

data.forEach(r=>{

  const price = getPrice(r);
  if(!price || !median) return;

  const deviation = ((price - median)/median)*100;

  if(Math.abs(deviation) > 50){

    anomalies.push({
      entity: r.Exporter,
      price: Number(price.toFixed(2)),
      median: Number(median.toFixed(2)),
      deviation: Number(deviation.toFixed(1)),
      weight: Number(r["Weight(Kg)"]||0),
      amount: Number(r["Amount($)"]||0),
      reason:
        deviation > 0
        ? "Over-invoicing (possible value inflation)"
        : "Under-invoicing (possible tax evasion)"
    });

  }

});

/* -----------------------------
TAX LOSS ESTIMATION
(using weight, not quantity)
-----------------------------*/
const taxLoss = anomalies.reduce((sum,r)=>{

  const expectedValue = r.median * r.weight;
  const actualValue = r.amount;

  return sum + Math.abs(expectedValue - actualValue);

},0);

/* -----------------------------
SUMMARY METRICS
-----------------------------*/
const totalTrade = data.reduce(
(a,b)=>a + Number(b["Amount($)"]||0),0
);

const anomalyRate = data.length
? ((anomalies.length/data.length)*100).toFixed(1)
: 0;

/* -----------------------------
RETURN
-----------------------------*/
return {
  clusters: Object.values(clusters)
    .sort((a,b)=>b.totalValue-a.totalValue)
    .slice(0,20),

  anomalies,

  taxLoss: Math.round(taxLoss),

  medianPrice: Number(median.toFixed(2)),

  anomalyRate,

  totalTrade
};

}
