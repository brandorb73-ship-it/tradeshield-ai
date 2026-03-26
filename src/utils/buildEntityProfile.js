export function buildEntityProfile(entity, data = [], stats = {}) {
  const entityStats = stats?.entityStats ?? {};

  const s = entityStats[entity] || {};

  const rows = (data || []).filter(
    d => d?.Exporter === entity || d?.Importer === entity
  );

  const summary = {
    totalShipments: rows.length,
    selfTrades: rows.filter(d => d.Exporter === d.Importer).length,
    hsIssues: rows.filter(d => d.hsMismatch).length,
    priceIssues: rows.filter(d => d.priceAnomaly).length,
  };

  const ers = {
    self: s?.self || 0,
    hs: s?.hs || 0,
    price: s?.price || 0,
    density: s?.density || 0,
    mlRisk: s?.mlRisk || 0,
    shellRisk: s?.shellRisk || 0,
    ringScore: s?.ringScore || 0,
    cycleScore: s?.cycleScore || 0,
    total: s?.total || 1,
  };

  return {
    entity,
    summary,
    ers,
  };
}
