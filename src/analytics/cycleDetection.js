export function detectCycles(graph){

  const cycles = [];

  const visit = (node,path)=>{

    if(path.includes(node)){
      const cycle = [...path.slice(path.indexOf(node)),node];
      cycles.push(cycle);
      return;
    }

    if(!graph[node]) return;

    graph[node].forEach(next=>{
      visit(next,[...path,node]);
    });

  };

  Object.keys(graph).forEach(n=>visit(n,[]));

  return cycles.filter(c=>c.length<=5);
}
