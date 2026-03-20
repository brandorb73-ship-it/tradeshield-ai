// corridorHeatmap.js
export function detectTradeCorridors(data) {
  const corridors = {};

  data.forEach(r => {
    // Ensure we have a route key
    const origin = r["Origin Country"] || "Unknown";
    const dest = r["Destination Country"] || "Unknown";
    const key = `${origin} → ${dest}`;

    if (!corridors[key]) {
      corridors[key] = {
        amount: 0,
        weight: 0,
        entities: new Set() // The UI needs this to show the company tags
      };
    }

    // Use the numeric versions calculated in analyzeFraud if available, 
    // otherwise parse directly
    const amt = r._numAmount || parseFloat(r["Amount($)"] || 0);
    const wgt = r._numWeight || parseFloat(r["Weight(Kg)"] || 0);

    corridors[key].amount += amt;
    corridors[key].weight += wgt;

    // Add entities involved in this specific corridor
    if (r.Exporter && r.Exporter !== "UNKNOWN") corridors[key].entities.add(r.Exporter);
    if (r.Importer && r.Importer !== "UNKNOWN") corridors[key].entities.add(r.Importer);
  });

  return corridors;
}
