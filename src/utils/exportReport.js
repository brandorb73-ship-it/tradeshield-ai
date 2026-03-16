export function generateReport(stats){

  return `

TRADE FRAUD INVESTIGATION REPORT

Total Trade Value: $${stats.totalAmt}

High Risk Entities:
${Object.keys(stats.entityStats).join(", ")}

Key Findings:

• VAT carousel behaviour detected
• U-turn trade loops detected
• Hub laundering via offshore jurisdictions
• Price manipulation anomalies

Recommended Action:
Immediate customs audit.

`;

}
