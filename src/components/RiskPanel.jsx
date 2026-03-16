export default function RiskPanel({scores}){

  return(

    <div className="grid grid-cols-3 gap-6">

      {Object.entries(scores).map(([entity,s])=>{

        return(

          <div key={entity}
          className="bg-white p-6 rounded-xl border">

            <h3 className="font-bold text-lg">{entity}</h3>

            <div className="text-4xl font-black text-red-600">
              {s.total}
            </div>

          </div>

        )

      })}

    </div>

  )

}
