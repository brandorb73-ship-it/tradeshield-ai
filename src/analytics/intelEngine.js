import { detectFraudRings } from "../analytics/fraudRings";
import { detectCycles } from "../analytics/cycleDetection";
import { calculateShellScore } from "../analytics/shellProbability"; 
import detectShellCompanies from "../analytics/shellDetector"; 
import { detectTradeCorridors } from "../analytics/corridorHeatmap";
import mlScore from "../analytics/mlAnomaly"; 
import detectInvoiceMismatch from "../analytics/invoiceCheck"; 

export default function runIntelEngine(data) {

  let rings = [];
  let cycles = [];
  let shellScores = {};
 let shellProbability = {};
  let corridors = [];
  let anomalies = [];
  let invoiceFlags = [];

  try { rings = detectFraudRings(data); } catch(e){}
  try { cycles = detectCycles(data); } catch(e){}
  try { shellScores = detectShellCompanies(data); } catch(e){}
  try { shellProbability = calculateShellScore(data); } catch(e){}
  try { corridors = detectTradeCorridors(data); } catch(e){}
  try { anomalies = mlScore(data); } catch(e){}
  try { invoiceFlags = detectInvoiceMismatch(data); } catch(e){}

  return {
    rings,
    cycles,
    shellScores,
    shellProbability,
    corridors,
    anomalies,
    invoiceFlags
  };
}
