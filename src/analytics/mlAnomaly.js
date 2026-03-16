export default function mlScore(data){

const scores={};

data.forEach(t=>{

const e=t.Exporter;

if(!scores[e]) scores[e]=0;

const price=parseFloat(t["Unit Price($)"]);
const weight=parseFloat(t["Weight(Kg)"]);

if(price>200) scores[e]+=2;
if(weight>10000) scores[e]+=3;

});

return scores;

}
