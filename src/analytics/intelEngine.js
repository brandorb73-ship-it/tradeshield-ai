import { detectFraudRings } from "../analytics/fraudRings";
import { detectCycles } from "../analytics/cycleDetection";
import { calculateShellScore } from "../analytics/shellDetector";
import { detectTradeCorridors } from "../analytics/corridorHeatmap";
import { detectmlScore} from "../analytics/mlAnomaly";
import { detectInvoiceMismatch } from "../analytics/invoiceCheck";

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
