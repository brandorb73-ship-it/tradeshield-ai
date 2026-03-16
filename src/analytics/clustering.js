export function detectInvoiceSplitting(rows){

  const clusters={};

  rows.forEach(r=>{

    const key =
      r.Exporter +
      r.Importer +
      r["Weight(Kg)"];

    if(!clusters[key]) clusters[key]=[];
    clusters[key].push(r);

  });

  return Object.values(clusters)
    .filter(c=>c.length>5);

}
