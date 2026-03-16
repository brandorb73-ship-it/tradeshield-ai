import { MapContainer, TileLayer, Polyline } from "react-leaflet";

export default function RouteRiskMap({routes}){

  const lines = Object.entries(routes).map(([route,d])=>{
    const [o,dst]=route.split("->");

    return [
      [Math.random()*80-40,Math.random()*160-80],
      [Math.random()*80-40,Math.random()*160-80]
    ];
  });

  return (

    <MapContainer center={[20,0]} zoom={2} style={{height:"600px"}}>

      <TileLayer
       url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {lines.map((l,i)=>(
        <Polyline key={i} positions={l}/>
      ))}

    </MapContainer>

  );

}
