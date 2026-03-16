export function detectFraudRings(data){

const graph={};

data.forEach(r=>{

if(!graph[r.Exporter]) graph[r.Exporter]=[];

graph[r.Exporter].push(r.Importer);

});

const visited=new Set();
const stack=new Set();
const rings=[];

function dfs(node,path){

if(stack.has(node)){

rings.push([...path,node]);
return;

}

if(visited.has(node)) return;

visited.add(node);
stack.add(node);

const neighbors=graph[node] || [];

neighbors.forEach(n=>{

dfs(n,[...path,node]);

});

stack.delete(node);

}

Object.keys(graph).forEach(n=>dfs(n,[]));

return rings;

}
