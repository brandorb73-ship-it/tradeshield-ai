export default function generateNarrative(stats, fraud){

return `
TRADE FORENSIC SUMMARY

Total Trade Value: $${stats.totalAmt}
Total Weight: ${stats.totalWeight} KG

HIGH RISK ENTITIES:
${fraud.vat.map(e=>`• ${e}`).join("\n")}

PHANTOM EXPORTERS:
${fraud.phantom.map(e=>`• ${e}`).join("\n")}

PRICE ANOMALIES:
${fraud.price.map(e=>`• ${e.entity} (${e.deviation}%)`).join("\n")}

ANALYSIS:

Data indicates structured trade flows with potential
circular trading and value manipulation.

RECOMMENDATION:

Immediate audit of high-risk entities and routes.
`;
}
