export default function detectInvoiceMismatch(data){

const issues=[];

data.forEach(t=>{

const calc=t.Quantity * t["Unit Price($)"];

if(Math.abs(calc - t["Amount($)"]) > calc*0.3){
issues.push(t.Exporter);
}

});

return [...new Set(issues)];

}
