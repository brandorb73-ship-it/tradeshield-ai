export function detectTradeLoops(graph){

const loops=[];

function dfs(node,path){

if(path.includes(node)){
loops.push([...path,node]);
return;
}

if(!graph[node]) return;

graph[node].forEach(n=>{
dfs(n,[...path,node]);
});

}

Object.keys(graph).forEach(n=>dfs(n,[]));

return loops.filter(l=>l.length<=6);

}
