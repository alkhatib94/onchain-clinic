// app/components/MainReportTable.tsx
type Row = { name: string; value: string };

export default function MainReportTable({ rows }: { rows: Row[] }) {
  return (
    <div className="bg-slate-900/60 rounded-2xl p-6 shadow-md border border-slate-700">
      <h2 className="text-xl font-semibold mb-4 text-white">Main Report</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex justify-between items-center bg-slate-800/40 rounded-lg px-4 py-3 hover:bg-slate-800/70 transition"
          >
            <span className="text-slate-300 font-medium">{row.name}</span>
            <span className="text-white font-semibold">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
