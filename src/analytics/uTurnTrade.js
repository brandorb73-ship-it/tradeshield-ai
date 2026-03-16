export default function detectUTurnTrade(data){

  const routes = {};

  data.forEach(t => {

    const route = `${t["Origin Country"]}-${t["Destination Country"]}`;

    if(!routes[route]) routes[route]=0;
    routes[route]++;

  });

  const suspicious = [];

  data.forEach(t => {

    const reverse = `${t["Destination Country"]}-${t["Origin Country"]}`;

    if(routes[reverse] > 3){
      suspicious.push(t.Exporter);
    }

  });

  return [...new Set(suspicious)];

}
