export function generateEntityNarrative(profile) {
  if (!profile) return "No intelligence available.";

 const { summary = {}, breakdown = {}, ersScore = 0 } = profile;

  const issues = [];

  if ((summary.hsIssues || 0) > 5)
    issues.push(`repeated HS mismatches (${summary.hsIssues})`);

  if ((summary.priceIssues || 0) > 5)
    issues.push(`abnormal pricing patterns (${summary.priceIssues})`);

  if ((summary.selfTrades || 0) > 0)
    issues.push(`self-trading behaviour (${summary.selfTrades})`);

if ((breakdown.ringScore || 0) > 10)
    issues.push(`network clustering indicating coordinated activity`);

if ((breakdown.cycleScore || 0) > 10)
    issues.push(`cyclical trade flows suggesting round-tripping`);

  if (issues.length === 0)
    return "Entity shows low-risk trade behaviour with no significant anomalies detected.";
  if (ersScore >= 70)
  issues.push("high composite risk score");

if (ersScore >= 40 && ersScore < 70)
  issues.push("moderate composite risk exposure");

  return `Entity shows elevated risk due to ${issues.join(", ")}.`;
}


export function generateGlobalNarrative(stats, ersData) {
  if (!ersData) return "Awaiting data for global analysis.";

  const entities = ersData || [];

  const highRisk = entities.filter(e => (e?.ersScore || 0) >= 70);
  const mediumRisk = entities.filter(
    e => (e?.ersScore || 0) >= 40 && (e?.ersScore || 0) < 70
  );

  return `
Global trade intelligence indicates ${highRisk.length} high-risk entities 
and ${mediumRisk.length} medium-risk entities.

Dominant risk drivers include HS code inconsistencies, pricing anomalies, 
and emerging network-based fraud patterns suggesting coordinated activity clusters.
  `;
}
