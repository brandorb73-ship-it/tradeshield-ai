/**
 * TRADESHIELD AI - Forensic Reporting Engine
 * Generates a text-based dossier for investigative purposes.
 */

export const generateForensicReport = (entity, data) => {
  const timestamp = new Date().toLocaleString();
  const caseId = `TS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  // Calculate specific risk indicators for the report
  const isHighVolume = data.amount > 100000;
  const riskLevel = isHighVolume ? "CRITICAL / HIGH PRIORITY" : "ELEVATED / MONITOR";

  const reportLines = [
    "============================================================",
    "               TRADESHIELD AI: FORENSIC DOSSIER             ",
    "               CONFIDENTIAL - INVESTIGATIVE USE ONLY        ",
    "============================================================",
    "",
    `CASE ID:        ${caseId}`,
    `GENERATED ON:   ${timestamp}`,
    `SUBJECT ENTITY: ${entity}`,
    `RISK STATUS:    ${riskLevel}`,
    "",
    "------------------------------------------------------------",
    "1. EXECUTIVE SUMMARY",
    "------------------------------------------------------------",
    `Evidence of "Self-Trade" or "Circular Flow" detected. The entity `,
    `has been identified acting as both the Exporter and Importer `,
    `within the same brand portfolio. This is a primary indicator `,
    `of VAT Carousel Fraud or Trade-Based Money Laundering (TBML).`,
    "",
    "------------------------------------------------------------",
    "2. FINANCIAL AUDIT DATA",
    "------------------------------------------------------------",
    `Total Circular Volume:  $${data.amount.toLocaleString()}`,
    `Total Net Weight:       ${data.weight.toLocaleString()} KG`,
    `Total Transactions:     ${data.count} confirmed shipments`,
    `Avg. Value Per Unit:    $${(data.amount / (data.weight || 1)).toFixed(2)} / KG`,
    "",
    "------------------------------------------------------------",
    "3. NETWORK & CORRIDOR FOOTPRINT",
    "------------------------------------------------------------",
    `Primary Jurisdictions:  ${data.countries?.join(' <-> ') || "N/A"}`,
    `Associated Brands:      ${data.brands?.join(', ') || "N/A"}`,
    "",
    "------------------------------------------------------------",
    "4. ANALYST DETERMINATION & RECOMMENDATIONS",
    "------------------------------------------------------------",
    "Pattern Recognition Analysis:",
    " - [X] Wash Trade Pattern Detected",
    " - [X] Artificial Turnover Inflation",
    ` - [${isHighVolume ? 'X' : ' '}] High-Value Threshold Breach`,
    "",
    "Recommended Action:",
    " -> Initiate manual HS-Code verification (Mismatched Declaring Audit)",
    " -> Cross-reference with Mass-Balance precursor data",
    " -> Flag for immediate physical inspection at customs hub",
    "",
    "============================================================",
    "                    END OF DOSSIER                          ",
    "============================================================",
  ];

  // Create the blob and trigger download
  try {
    const blob = new Blob([reportLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Clean filename: Replace spaces with underscores
    const safeFileName = entity.replace(/[^a-z0-9]/gi, '_').toUpperCase();
    
    link.href = url;
    link.download = `TRADESHIELD_REPORT_${safeFileName}.txt`;
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to generate forensic report:", error);
  }
};
