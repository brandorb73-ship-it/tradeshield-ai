export default function generateNarrative(stats,fraud){

return `

TradeShield Forensic Intelligence Summary

Dataset analyzed contains ${stats.totalWeight} KG of goods
valued at $${stats.totalAmt}.

Key Findings:

• ${fraud.vat.length} entities show VAT carousel behaviour
• ${fraud.phantom.length} phantom exporters detected
• ${fraud.price.length} price manipulation indicators

Network analysis suggests potential
hub-and-spoke laundering patterns.

Recommended action:
Prioritize customs audit on flagged entities.

`;

}
