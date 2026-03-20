const generateForensicReport = (entity, data) => {
  const reportContent = `
    FORENSIC REPORT: ${entity}
    Generated: ${new Date().toLocaleString()}
    -------------------------------------------
    RISK STATUS: CRITICAL (CIRCULAR TRADE)
    TOTAL CIRCULAR VOLUME: $${data.amount.toLocaleString()}
    TOTAL NET WEIGHT: ${data.weight.toLocaleString()} KG
    TOTAL TRANSACTIONS: ${data.count}
    
    NETWORK FOOTPRINT:
    Countries: ${data.countries.join(', ')}
    Associated Brands: ${data.brands.join(', ')}
    
    ANALYSIS:
    Evidence suggests active VAT Carousel or Wash Trade patterns.
  `;
  const blob = new Blob([reportContent], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Forensic_Report_${entity.replace(/\s+/g, '_')}.txt`;
  link.click();
};
