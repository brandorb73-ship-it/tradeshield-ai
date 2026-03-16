export default function detectShellCompanies(data){

const stats={};

data.forEach(t=>{

const e=t.Exporter;

if(!stats[e]){
stats[e]={value:0,countries:new Set()};
}

stats[e].value += parseFloat(t["Amount($)"]);
stats[e].countries.add(t["Origin Country"]);

});

const shells=[];

Object.entries(stats).forEach(([k,v])=>{

if(v.value>500000 && v.countries.size<=1){
shells.push(k);
}

});

return shells;

}
