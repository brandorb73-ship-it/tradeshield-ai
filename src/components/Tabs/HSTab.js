export const HSTab = ({ hsAgg }) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Object.values(hsAgg).map(item => (
        <div key={item.hs} className="bg-white p-6 rounded-3xl border-2 border-slate-900 flex justify-between">
          <span className="font-black">HS: {item.hs}</span>
          <span className="text-red-600 font-black">${item.amount.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};
