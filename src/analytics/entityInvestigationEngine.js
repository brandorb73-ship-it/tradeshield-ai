// entityInvestigationEngine.js

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

    const route = `${r["Origin Country"]} → ${r["Destination Country"]}`;
    routes[route] = (routes[route] || 0) + value;

    brands[r.Brand] = (brands[r.Brand] || 0) + value;

    const other = r.Exporter === entity ? r.Importer : r.Exporter;
    counterparties[other] = (counterparties[other] || 0) + value;
  });

  const weights = {
    self: 20,
    hs: 15,
    price: 20,
    density: 30,
    mlRisk: 20,
    shellRisk: 30,
    ringScore: 40,
    cycleScore: 35
  };
const num = (v) => Number(v) || 0;

  console.log("ERS DEBUG:", entity, s, raw, maxScore);
  
  const s = stats.entityStats?.[entity] || {};

const raw =
  num(s.self) * weights.self +
  num(s.hs) * weights.hs +
  num(s.price) * weights.price +
  num(s.density) * weights.density +
  num(s.mlRisk) * weights.mlRisk +
  num(s.shellRisk) * weights.shellRisk +
  num(s.ringScore) * weights.ringScore +
  num(s.cycleScore) * weights.cycleScore;

  const maxScore = Object.values(weights).reduce((a,b) => a+b, 0);

  const finalScore = maxScore > 0 ? Math.min(100, (raw / maxScore) * 100) : 0;

  return {
    entity,
    summary,
    topRoutes: Object.entries(routes)
      .sort((a,b) => b[1]-a[1])
      .slice(0,5),
    topBrands: Object.entries(brands)
      .sort((a,b) => b[1]-a[1])
      .slice(0,5),
    linkedEntities: Object.entries(counterparties)
      .sort((a,b) => b[1]-a[1])
      .slice(0,10),
    ers: {
      ...s,
      finalScore,
      audit: {
        raw,
        maxScore,
        breakdown: {
  self: num(s.self) * weights.self,
  hs: num(s.hs) * weights.hs,
  price: num(s.price) * weights.price,
  density: num(s.density) * weights.density,
  mlRisk: num(s.mlRisk) * weights.mlRisk,
  shellRisk: num(s.shellRisk) * weights.shellRisk,
  ringScore: num(s.ringScore) * weights.ringScore,
  cycleScore: num(s.cycleScore) * weights.cycleScore
}
        }
      }
    }
  };
}
