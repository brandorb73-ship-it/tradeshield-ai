import { useMemo } from "react";

export default function useERS(stats) {
  return useMemo(() => {
    const entities = stats?.entityStats ?? {};

    return Object.entries(entities).map(([name, s]) => {
      const num = (v) => Number(v) || 0;

      const self = num(s.self);
      const hs = num(s.hs);
      const price = num(s.price);
      const density = num(s.density);
      const mlRisk = num(s.mlRisk);
      const shellRisk = num(s.shellRisk);
      const ringScore = num(s.ringScore);
      const cycleScore = num(s.cycleScore);
      const total = num(s.total) || 1;

      const raw =
        self * 20 +
        hs * 15 +
        price * 20 +
        density * 30 +
        mlRisk * 20 +
        shellRisk * 30 +
        ringScore * 25 +
        cycleScore * 25;

      const final = Math.min(100, raw / total);

return {
  name,
  shipments: s.shipments || s.count || 0,
  anomalies: self + hs + price,
  ersScore: Number(final.toFixed(1)),

  summary: {
    totalShipments: s.shipments || s.count || 0,
    selfTrades: self,
    hsIssues: hs,
    priceIssues: price,
  },

  breakdown: {
    self,
    hs,
    price,
    density,
    mlRisk,
    shellRisk,
    ringScore,
    cycleScore,
  },
};
    }).sort((a, b) => b.ersScore - a.ersScore);
  }, [stats]);
}
