export function fraudProbability(entity){

  const score =
    entity.circular * 4 +
    entity.exports * 0.2 +
    entity.imports * 0.2;

  const prob = 1/(1+Math.exp(-score/10));

  return (prob*100).toFixed(1);

}
