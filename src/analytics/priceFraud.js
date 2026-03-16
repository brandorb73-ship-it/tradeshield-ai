export default function detectPriceFraud(data){

  const prices = {};
  const suspicious=[];

  data.forEach(t=>{

    const brand = t.Brand;

    const price = parseFloat(t["Amount($)"]) /
                  parseFloat(t["Weight(Kg)"]);

    if(!prices[brand]) prices[brand]=[];

    prices[brand].push(price);

  });

  const avg={};

  Object.keys(prices).forEach(b=>{
    avg[b]=prices[b].reduce((a,b)=>a+b,0)/prices[b].length;
  });

  data.forEach(t=>{

    const brand=t.Brand;

    const price=parseFloat(t["Amount($)"]) /
                parseFloat(t["Weight(Kg)"]);

    if(price > avg[brand]*1.5 || price < avg[brand]*0.5){
      suspicious.push(t.Exporter);
    }

  });

  return [...new Set(suspicious)];

}
