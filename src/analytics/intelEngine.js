import { detectFraudRings } from "./fraudRings";
import { detectCycles } from "./cycleDetection";
import { calculateShellProbability } from "./shellProbability";
import { detectCorridors } from "./corridorHeatmap";
import { detectMLAnomaly } from "./mlAnomaly";
import { invoiceCheck } from "./invoiceCheck";

export default function runIntelEngine(data) {

  let rings = [];
  let cycles = [];
  let shellScores = {};
  let corridors = [];
  let anomalies = [];
  let invoiceFlags = [];

  try { rings = detectFraudRings(data); } catch(e){}
  try { cycles = detectCycles(data); } catch(e){}
  try { shellScores = calculateShellProbability(data); } catch(e){}
  try { corridors = detectCorridors(data); } catch(e){}
  try { anomalies = detectMLAnomaly(data); } catch(e){}
  try { invoiceFlags = invoiceCheck(data); } catch(e){}

  return {
    rings,
    cycles,
    shellScores,
    corridors,
    anomalies,
    invoiceFlags
  };
}
