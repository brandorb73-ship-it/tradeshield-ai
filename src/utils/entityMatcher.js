export function similar(a,b){

  a=a.toLowerCase();
  b=b.toLowerCase();

  return a.replace(/\W/g,"")
      === b.replace(/\W/g,"");

}
