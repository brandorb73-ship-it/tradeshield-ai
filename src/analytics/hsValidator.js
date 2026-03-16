const TOBACCO_CODES=["240220","240290"];

export default function validateHS(data){

const issues=[];

data.forEach(t=>{

if(
t.Brand?.toLowerCase().includes("cigarette") &&
!TOBACCO_CODES.includes(t["HS Code"])
){
issues.push(t.Exporter);
}

});

return [...new Set(issues)];

}
