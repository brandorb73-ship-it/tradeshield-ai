export function buildMastermindScores(data, europolScores = {}) {
  const entityMap = {};

  // --- BUILD NETWORK ---
  data.forEach(r => {
    const exp = r.Exporter;
    const imp = r.Importer;
    const value = r["Amount($)"] || 0;

    if (!entityMap[exp]) {
      entityMap[exp] = initEntity(exp);
    }
    if (!entityMap[imp]) {
      entityMap[imp] = initEntity(imp);
    }

    entityMap[exp].connections[imp] =
      (entityMap[exp].connections[imp] || 0) + value;

    entityMap[imp].connections[exp] =
      (entityMap[imp].connections[exp] || 0) + value;

    // Fraud signals
    if (r._isHS || r._isPrice) {
      entityMap[exp].fraudLinks += 1;
      entityMap[imp].fraudLinks += 1;
    }

    if (r._isSelf) {
      entityMap[exp].selfLoops += 1;
    }
  });

  // --- CALCULATE SCORES ---
  const results = Object.values(entityMap).map(e => {
    const connectionCount = Object.keys(e.connections).length;
    const totalFlow = Object.values(e.connections).reduce((a, b) => a + b, 0);

    const connectivity = connectionCount * 5 + totalFlow / 100000;

    const ringInfluence = e.fraudLinks * 10;

    const cycleScore = e.selfLoops * 15;

    const europol = europolScores[e.name] || {};

    const ml = europol.mlScore || 0;
    const shell = europol.shellScore || 0;
    const corridor = europol.corridorRisk || 0;

    const raw =
      0.3 * connectivity +
      0.25 * ringInfluence +
      0.2 * cycleScore +
      0.15 * ml +
      0.1 * (shell + corridor);

    return {
      name: e.name,
      score: Math.min(100, raw),
      connectivity,
      ringInfluence,
      cycleScore,
      ml,
      shell,
      corridor
    };
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 15);
}

// --- INIT ---
function initEntity(name) {
  return {
    name,
    connections: {},
    fraudLinks: 0,
    selfLoops: 0
  };
}
