export default function detectVATCarousel(data){

  const graph = {};

  data.forEach(t => {

    const a = t.Exporter;
    const b = t.Importer;

    if(!graph[a]) graph[a]=[];
    graph[a].push(b);

  });

  const suspicious = [];

  Object.keys(graph).forEach(a => {

    graph[a].forEach(b => {

      if(graph[b] && graph[b].includes(a)){
        suspicious.push(a);
        suspicious.push(b);
      }

    });

  });

  return [...new Set(suspicious)];

}
