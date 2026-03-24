export function buildEntityProfile(entity, data, stats) {
  if (!entity) return null;

  const rows = data.filter(
    d => d.Exporter === entity || d.Importer === entity
  );

  const summary = {
    totalShipments: rows.length,
    totalValue: 0,
    totalWeight: 0,
    selfTrades: 0,
    hsFlags: 0,
    priceFlags: 0,
    densityFlags: 0,
  };

  const routes = {};
  const brands = {};
  const counterparties = {};

  rows.forEach(r => {
    const value = r["Amount($)"] || 0;
    const weight = r["Weight(Kg)"] || 0;

    summary.totalValue += value;
    summary.totalWeight += weight;

    if (r._isSelf) summary.selfTrades++;
    if (r._isHS) summary.hsFlags++;
    if (r._isPrice) summary.priceFlags++;
    if (r._isDensityAnomaly) summary.densityFlags++;

    // ROUTES
    const route = `${r["Origin Country"]} → ${r["Destination Country"]}`;
    routes[route] = (routes[route] || 0) + value;

    // BRANDS
    brands[r.Brand] = (brands[r.Brand] || 0) + value;

    // LINKED ENTITIES
    const other = r.Exporter === entity ? r.Importer : r.Exporter;
    counterparties[other] = (counterparties[other] || 0) + value;
  });

  return {
    entity,
    summary,
    topRoutes: Object.entries(routes).sort((a,b)=>b[1]-a[1]).slice(0,5),
    topBrands: Object.entries(brands).sort((a,b)=>b[1]-a[1]).slice(0,5),
    linkedEntities: Object.entries(counterparties).sort((a,b)=>b[1]-a[1]).slice(0,10),
    ers: stats.entityStats?.[entity] || {}
  };
}
