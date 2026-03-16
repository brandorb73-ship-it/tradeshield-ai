import {MapContainer,TileLayer,Polyline} from "react-leaflet";

export default function RouteRiskMap({routes}){

return(

<MapContainer center={[20,0]} zoom={2} style={{height:"500px"}}>

<TileLayer
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

{routes.map((r,i)=>(
<Polyline key={i} positions={r.coords}/>
))}

</MapContainer>

)

}
