export function fraudScore(entity){

let score=0;

score += entity.selfTrades*4;

score += entity.hsMismatch*2;

score += entity.priceAnomaly*3;

score += entity.circularLoops*5;

score += entity.routeRisk*2;

return score;

}
