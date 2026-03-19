export function calculateFraudProbability(data, intel) {

  let score = 0;

  const total = data.length || 1;

  const weights = {
    price: 0.2,
    vat: 0.2,
    rings: 0.2,
    cycles: 0.15,
    shell: 0.15,
    anomaly: 0.1
  };

  const priceFlags = data.filter(d => d._isPrice).length / total;
  const selfFlags = data.filter(d => d._isSelf).length / total;

  const ringScore = (intel.rings?.length || 0) / 10;
  const cycleScore = (intel.cycles?.length || 0) / 10;

  const shellScore = Object.values(intel.shellScores || {})
    .reduce((a, c) => a + c, 0) / (Object.keys(intel.shellScores || {}).length || 1);

  const anomalyScore = (intel.anomalies?.length || 0) / total;

  score =
    priceFlags * weights.price +
    selfFlags * weights.vat +
    ringScore * weights.rings +
    cycleScore * weights.cycles +
    shellScore * weights.shell +
    anomalyScore * weights.anomaly;

  return {
    score: Math.min(1, score),
    breakdown: {
      priceFlags,
      selfFlags,
      ringScore,
      cycleScore,
      shellScore,
      anomalyScore
    }
  };
}
