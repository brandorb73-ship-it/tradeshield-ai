import detectVATCarousel from "./vatCarousel";
import detectUTurnTrade from "./uTurnTrade";
import detectPhantomExporter from "./phantomExporter";
import detectCorridors from "./corridorIntel";
import detectPriceFraud from "./priceFraud";

export default function runFraudEngine(data) {

  const vat = detectVATCarousel(data);
  const uturn = detectUTurnTrade(data);
  const phantom = detectPhantomExporter(data);
  const corridors = detectCorridors(data);
  const price = detectPriceFraud(data);

  const entityScores = {};

  data.forEach(row => {

    const entity = row.Exporter;

    if(!entityScores[entity]){
      entityScores[entity] = {
        vat:0,
        uturn:0,
        phantom:0,
        corridor:0,
        price:0,
        total:0
      };
    }

    if(vat.includes(entity)) entityScores[entity].vat+=5;
    if(uturn.includes(entity)) entityScores[entity].uturn+=4;
    if(phantom.includes(entity)) entityScores[entity].phantom+=6;
    if(corridors.includes(entity)) entityScores[entity].corridor+=3;
    if(price.includes(entity)) entityScores[entity].price+=4;

    entityScores[entity].total =
      entityScores[entity].vat +
      entityScores[entity].uturn +
      entityScores[entity].phantom +
      entityScores[entity].corridor +
      entityScores[entity].price;

  });

  return entityScores;
}
