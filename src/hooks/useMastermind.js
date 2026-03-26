import { useMemo } from "react";

export default function useMastermind(stats) {
  return useMemo(() => {
    const entities = stats?.entityStats ?? {};

    return Object.entries(entities).map(([name, s]) => {
      const connections = Math.min(100, (s.partners || 0) * 5);
      const ring = Math.min(100, s.ringScore || 0);
      const cycle = Math.min(100, s.cycleScore || 0);

      const score = Math.min(100, (connections + ring + cycle) / 3);

      return {
        name,
        mastermindScore: Number(score.toFixed(1)),
        connections,
        ring,
        cycle,
      };
    });
  }, [stats]);
}
