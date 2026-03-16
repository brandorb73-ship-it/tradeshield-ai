export function generateNarrative(stats, cycles){

  const high = Object.entries(stats)
    .sort((a,b)=>b[1].circular-a[1].circular)[0];

  return `
Primary entity of concern: ${high[0]}.

Detected ${cycles.length} circular trade loops suggesting
potential VAT carousel or round-tripping.

Network analysis indicates hub-and-spoke structure
consistent with transshipment laundering.

Further investigation recommended into invoice
pricing deviations and rapid re-exports.
`;
}
