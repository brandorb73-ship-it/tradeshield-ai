export function calculateFraudProbability(data, fraudStats, shellScores){

return data.map(r=>{

let score = 0;
let reasons = [];

/* -----------------------------
VAT / Fraud Signals
-----------------------------*/
if(fraudStats?.vat?.includes(r.Exporter)){
score += 25;
reasons.push("VAT carousel involvement");
}

if(fraudStats?.phantom?.includes(r.Exporter)){
score += 20;
reasons.push("Phantom exporter pattern");
}

if(fraudStats?.price?.includes(r.Exporter)){
score += 15;
reasons.push("Price manipulation detected");
}

/* -----------------------------
Shell Risk
-----------------------------*/
const shell = shellScores[r.Exporter] || 0;

score += shell * 0.3;

if(shell > 70){
reasons.push("High shell company probability");
}

/* -----------------------------
Price Anomaly
-----------------------------*/
const unitPrice = parseFloat(r["Unit Price($)"]||0);

if(unitPrice > 25){
score += 10;
reasons.push("High unit price anomaly");
}

/* -----------------------------
Weight vs Value Density
-----------------------------*/
const density =
parseFloat(r["Amount($)"]||0) /
(parseFloat(r["Weight(Kg)"]||1));

if(density > 80){
score += 15;
reasons.push("High value per kg (smuggling indicator)");
}

/* -----------------------------
Clamp Score
-----------------------------*/
score = Math.min(100, Math.round(score));

return {
...r,
fraudScore: score,
fraudLevel:
score > 70 ? "HIGH" :
score > 40 ? "MEDIUM" : "LOW",
reasons
};

});

}
