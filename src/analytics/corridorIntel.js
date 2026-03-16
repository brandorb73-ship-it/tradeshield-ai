const HIGH_RISK_HUBS = [
"UAE",
"Cyprus",
"Latvia",
"Singapore"
];

export default function detectCorridors(data){

  const suspicious = [];

  data.forEach(t=>{

    if(
      HIGH_RISK_HUBS.includes(t["Origin Country"]) ||
      HIGH_RISK_HUBS.includes(t["Destination Country"])
    ){
      suspicious.push(t.Exporter);
    }

  });

  return [...new Set(suspicious)];

}
