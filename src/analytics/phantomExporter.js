export default function detectPhantomExporter(data){

  const entityStats = {};

  data.forEach(t=>{

    const e = t.Exporter;

    if(!entityStats[e]){
      entityStats[e] = {
        exports:0,
        imports:0
      };
    }

    entityStats[e].exports++;

  });

  data.forEach(t=>{

    const i = t.Importer;

    if(entityStats[i]){
      entityStats[i].imports++;
    }

  });

  const suspicious=[];

  Object.entries(entityStats).forEach(([k,v])=>{

    if(v.exports>5 && v.imports===0){
      suspicious.push(k);
    }

  });

  return suspicious;

}
