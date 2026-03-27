export function generateEntityNarrative(profile) {
  if (!profile) return "No intelligence available.";

  const { summary = {}, ers = {} } = profile;

  const issues = [];

  if ((summary.hsIssues || 0) > 5)
    issues.push(`repeated HS mismatches (${summary.hsIssues})`);

  if ((summary.priceIssues || 0) > 5)
    issues.push(`abnormal pricing patterns (${summary.priceIssues})`);

  if ((summary.selfTrades || 0) > 0)
    issues.push(`self-trading behaviour (${summary.selfTrades})`);

  if ((ers.ringScore || 0) > 50)
    issues.push(`network clustering indicating coordinated activity`);

  if ((ers.cycleScore || 0) > 50)
    issues.push(`cyclical trade flows suggesting round-tripping`);

  if (issues.length === 0)
    return "Entity shows low-risk trade behaviour with no significant anomalies detected.";

  return `Entity shows elevated risk due to ${issues.join(", ")}.`;
}


export function generateGlobalNarrative(stats, ersData) {
  if (!ersData) return "Awaiting data for global analysis.";

  const entities = Object.values(ersData || {});
  const highRisk = entities.filter(e => (e?.ers?.total || 0) > 70);
  const mediumRisk = entities.filter(e => (e?.ers?.total || 0) > 40);

  return `
Global trade intelligence indicates ${highRisk.length} high-risk entities 
and ${mediumRisk.length} medium-risk entities.

Dominant risk drivers include HS code inconsistencies, pricing anomalies, 
and emerging network-based fraud patterns suggesting coordinated activity clusters.
  `;
}
