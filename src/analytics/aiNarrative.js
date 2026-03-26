// ========================= aiNarratives.js =========================
export function generateEntityNarrative(profile) {
  if (!profile) return "No data available.";

  const { summary = {}, ers = {} } = profile;

  let reasons = [];

  if ((summary.hsIssues || 0) > 5) {
    reasons.push(`repeated HS classification inconsistencies (${summary.hsIssues})`);
  }

  if ((summary.priceIssues || 0) > 5) {
    reasons.push(`abnormal pricing patterns (${summary.priceIssues} cases)`);
  }

  if ((ers.ringScore || 0) > 60) {
    reasons.push("strong network clustering indicative of coordinated activity");
  }

  if ((ers.cycleScore || 0) > 60) {
    reasons.push("circular trade flows suggesting potential laundering structures");
  }

  if ((ers.shellRisk || 0) > 60) {
    reasons.push("characteristics consistent with shell entity behavior");
  }

  if (reasons.length === 0) {
    return "Entity currently shows low anomaly signals across trade, pricing, and network dimensions.";
  }

  return `Entity exhibits elevated risk due to ${reasons.join(", ")}.`;
}

export function generateGlobalNarrative(stats, ersData) {
  const entries = Object.entries(ersData || {});

  const top = entries
    .sort((a, b) => (b[1]?.ers?.total || 0) - (a[1]?.ers?.total || 0))
    .slice(0, 3)
    .map(([name]) => name);

  let patterns = [];

  entries.forEach(([_, p]) => {
    if ((p?.ers?.hs || 0) > 60) patterns.push("HS anomalies");
    if ((p?.ers?.price || 0) > 60) patterns.push("pricing irregularities");
    if ((p?.ers?.ringScore || 0) > 60) patterns.push("network clustering");
  });

  const uniquePatterns = [...new Set(patterns)];

  return `Highest risk entities include ${top.join(", ")}. Dominant risk patterns observed are ${uniquePatterns.join(", ")}. Network signals indicate structured and potentially coordinated trade behavior across multiple entities.`;
}
