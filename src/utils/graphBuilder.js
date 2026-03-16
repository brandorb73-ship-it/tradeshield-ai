export function buildGraph(data){

  const nodes = {};
  const links = [];

  data.forEach(t=>{

    nodes[t.Exporter]=true;
    nodes[t.Importer]=true;

    links.push({
      source:t.Exporter,
      target:t.Importer,
      value:t["Amount($)"]
    });

  });

  return {
    nodes:Object.keys(nodes).map(n=>({id:n})),
    links
  };

}
