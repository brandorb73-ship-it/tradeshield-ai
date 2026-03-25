export function buildEntityProfile(entity, data, stats, mode = "combined") {
  if (!entity) return null;

  // ✅ SPLIT MODES
  let rows;

  if (mode === "exporter") {
    rows = data.filter(d => d.Exporter === entity);
  } else if (mode === "importer") {
    rows = data.filter(d => d.Importer === entity);
  } else {
    rows = data.filter(
      d => d.Exporter === entity || d.Importer === entity
    );
  }

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
  const counterparties = {};

  rows.forEach(r => {
    const value = r["Amount($)"] || 0;

    summary.totalValue += value;
    summary.totalWeight += r["Weight(Kg)"] || 0;

    const isSelf = r.Exporter === r.Importer;

    if (isSelf) summary.selfTrades++;
    if (r._isHS) summary.hsFlags++;
    if (r._isPrice) summary.priceFlags++;
    if (r._isDensityAnomaly) summary.densityFlags++;

    const route = `${r["Origin Country"]} → ${r["Destination Country"]}`;
    routes[route] = (routes[route] || 0) + value;

    const other =
      r.Exporter === entity ? r.Importer : r.Exporter;

    counterparties[other] =
      (counterparties[other] || 0) + value;
  });

  // --- WEIGHTS ---
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

  const num = v => Number(v) || 0;
  const base = stats.entityStats?.[entity] || {};

  const total = summary.totalShipments || 1;

  // ✅ NORMALIZED SIGNALS
  const s = {
    self: summary.selfTrades / total,
    hs: summary.hsFlags / total,
    price: summary.priceFlags / total,
    density: summary.densityFlags / total,

    mlRisk: num(base.mlRisk) / 100,
    shellRisk: num(base.shellRisk) / 100,

    // ✅ FIX: compress large scores instead of clamping
    ringScore: 1 - Math.exp(-num(base.ringScore) / 200),
    cycleScore: 1 - Math.exp(-num(base.cycleScore) / 200)
  };

  const raw =
    s.self * weights.self +
    s.hs * weights.hs +
    s.price * weights.price +
    s.density * weights.density +
    s.mlRisk * weights.mlRisk +
    s.shellRisk * weights.shellRisk +
    s.ringScore * weights.ringScore +
    s.cycleScore * weights.cycleScore;

  const maxScore = Object.values(weights).reduce((a, b) => a + b, 0);

  const finalScore = (raw / maxScore) * 100;

  return {
    entity,
    mode,
    summary,
    ers: {
      ...s,
      finalScore,
      audit: {
        raw,
        maxScore
      }
    },
    topRoutes: Object.entries(routes).slice(0, 5),
    linkedEntities: Object.entries(counterparties).slice(0, 10)
  };
}
