export function analyzeFraudAdvanced(rows) {

  const parse = v => parseFloat(v?.toString().replace(/[^0-9.]/g,'')) || 0;

  const entityStats = {};
  const routeFlows = {};
  const priceData = {};
  const tradeGraph = {};
  const shipmentTimeline = {};

  rows.forEach(r => {

    const exporter = r.Exporter;
    const importer = r.Importer;

    const weight = parse(r["Weight(Kg)"]);
    const amount = parse(r["Amount($)"]);
    const price = r["Unit Price($)"] 
        ? parse(r["Unit Price($)"])
        : amount/(weight||1);

    const route = `${r["Origin Country"]}->${r["Destination Country"]}`;

    if(!entityStats[exporter]) {
      entityStats[exporter] = {
        exports:0,
        imports:0,
        value:0,
        circular:0
      };
    }

    if(!entityStats[importer]) {
      entityStats[importer] = {
        exports:0,
        imports:0,
        value:0,
        circular:0
      };
    }

    entityStats[exporter].exports++;
    entityStats[importer].imports++;

    entityStats[exporter].value += amount;

    if(exporter === importer){
      entityStats[exporter].circular++;
    }

    // Graph
    if(!tradeGraph[exporter]) tradeGraph[exporter]=[];
    tradeGraph[exporter].push(importer);

    // Route flow
    if(!routeFlows[route]) {
      routeFlows[route]={weight:0,value:0,count:0};
    }

    routeFlows[route].weight+=weight;
    routeFlows[route].value+=amount;
    routeFlows[route].count++;

    // price data
    if(!priceData[r.Brand]) priceData[r.Brand]=[];
    priceData[r.Brand].push(price);

    // timeline
    if(!shipmentTimeline[exporter]) shipmentTimeline[exporter]=[];
    shipmentTimeline[exporter].push({
        date:r.Date,
        to:importer,
        brand:r.Brand,
        weight,
        amount
    });

  });

  return {
    entityStats,
    routeFlows,
    tradeGraph,
    priceData,
    shipmentTimeline
  };

}
