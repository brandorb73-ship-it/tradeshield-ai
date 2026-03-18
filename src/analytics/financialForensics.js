export function financialAnalysis(data) {
  if (!data || data.length === 0) {
    return { clusters: [], anomalies: [], taxLoss: 0, avgPrice: 0, anomalyRate: 0 };
  }

  /* -----------------------------
  SAFE UNIT PRICE
  -----------------------------*/
  const getPrice = (r) => {
    const declared = Number(r["Unit Price($)"]);
    if (declared && declared > 0) return declared;

    const amt = Number(r["Amount($)"]) || 0;
    const weight = Number(r["Weight(Kg)"]) || 0;

    return weight > 0 ? amt / weight : 0;
  };

  /* -----------------------------
  BUILD PRICE ARRAY & MEDIAN
  -----------------------------*/
  const prices = data
    .map(getPrice)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;

  /* -----------------------------
  INVOICE CLUSTERING
  -----------------------------*/
  const clusters = {};

  data.forEach((r) => {
    const price = getPrice(r);
    const band = Math.round(price / 5) * 5; // group into $5 bands
    const key = `${r.Exporter}-${band}`;

    if (!clusters[key]) {
      clusters[key] = {
        exporter: r.Exporter,
        priceBand: band,
        shipments: 0,
        totalValue: 0,
      };
    }

    clusters[key].shipments += 1;
    clusters[key].totalValue += Number(r["Amount($)"] || 0);
  });

  /* -----------------------------
  VALUE ANOMALIES
  -----------------------------*/
  const anomalies = [];

  data.forEach((r) => {
    const price = getPrice(r);
    if (!price || !median) return;

    const deviation = ((price - median) / median) * 100;

    // Flagging items 50% away from the median
    if (Math.abs(deviation) > 50) {
      anomalies.push({
        entity: r.Exporter,
        price: Number(price.toFixed(2)),
        median: Number(median.toFixed(2)),
        deviation: Number(deviation.toFixed(1)),
        weight: Number(r["Weight(Kg)"] || 0),
        amount: Number(r["Amount($)"] || 0),
        reason:
          deviation > 0
            ? "Over-invoicing (Value Inflation)"
            : "Under-invoicing (Tax Evasion)",
      });
    }
  });

  /* -----------------------------
  TAX LOSS ESTIMATION
  -----------------------------*/
  const taxLoss = anomalies.reduce((sum, r) => {
    const expectedValue = r.median * r.weight;
    const actualValue = r.amount;
    return sum + Math.abs(expectedValue - actualValue);
  }, 0);

  /* -----------------------------
  FINAL RETURN
  -----------------------------*/
  return {
    // Corrected: Just return the array of values from the clusters object
    clusters: Object.values(clusters),
    anomalies,
    taxLoss: Math.round(taxLoss),
    avgPrice: median, // Using median as the robust baseline
    anomalyRate: ((anomalies.length / data.length) * 100).toFixed(2),
  };
}
