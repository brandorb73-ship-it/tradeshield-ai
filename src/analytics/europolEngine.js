export function buildEuropolSignals(entity, data, stats) {
  if (!entity) return null;

  const rows = data.filter(
    d => d.Exporter === entity || d.Importer === entity
  );

  if (!rows.length) return null;

  let shellScore = 0;
  let ringScore = 0;
  let cycleScore = 0;
  let mlScore = 0;
  let corridorRisk = 0;

  const countries = new Set();
  const partners = new Set();
  const values = [];

  rows.forEach(r => {
    const other = r.Exporter === entity ? r.Importer : r.Exporter;

    partners.add(other);
    countries.add(r["Origin Country"]);
    countries.add(r["Destination Country"]);

    const value = r["Amount($)"] || 0;
    values.push(value);

    // --- SHELL SIGNALS ---
    if (value < 5000) shellScore += 1;
    if (r._isSelf) shellScore += 2;
    if (partners.size < 3) shellScore += 1;

    // --- FRAUD SIGNALS ---
    if (r._isHS) ringScore += 2;
    if (r._isPrice) ringScore += 2;
    if (r._isDensityAnomaly) ringScore += 1;

    // --- ML ANOMALY ---
    if (value > 1000000) mlScore += 2;
    if (value < 100) mlScore += 1;

    // --- CORRIDOR RISK ---
    const route = `${r["Origin Country"]}-${r["Destination Country"]}`;
    if (
      route.includes("China") ||
      route.includes("UAE") ||
      route.includes("Turkey")
    ) {
      corridorRisk += 2;
    }
  });

  // --- CYCLE DETECTION (very simple loop heuristic) ---
  if (partners.size > 0 && countries.size <= 3) {
    cycleScore = partners.size * 2;
  }

  // --- NORMALISE (0–100) ---
  const normalise = (v, max) => Math.min(100, (v / max) * 100);

  return {
    shellScore: normalise(shellScore, rows.length * 3),
    ringScore: normalise(ringScore, rows.length * 3),
    cycleScore: normalise(cycleScore, 20),
    mlScore: normalise(mlScore, rows.length * 2),
    corridorRisk: normalise(corridorRisk, rows.length * 2)
  };
}
