"use client";

type Item = { label: string; desc?: string; done: boolean };

export default function Section({
  title,
  metricRight,       // نص صغير يمين العنوان (اختياري)
  items,
}: {
  title: string;
  metricRight?: string;
  items: Item[];
}) {
  const done = items.filter(i => i.done).length;
  const total = items.length || 1;
  const pct = Math.round((done / total) * 100);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        {metricRight ? <div className="text-xs opacity-70">{metricRight}</div> : null}
      </div>

      {/* Rows */}
      <div className="p-5 space-y-3">
        {items.map((it, i) => (
          <div key={i}
               className={`flex items-center gap-3 px-3 py-3 rounded-xl border 
               ${it.done ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10"}`}>
            <div className={`w-6 h-6 rounded-md text-xs flex items-center justify-center 
                 ${it.done ? "bg-emerald-500 text-black" : "bg-red-500 text-black"}`}>
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{it.label}</div>
              {it.desc && <div className="text-xs opacity-70">{it.desc}</div>}
            </div>

            <div className={`text-sm font-bold ${it.done ? "text-emerald-400" : "text-red-400"}`}>
              {it.done ? "✓" : "✕"}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Progress */}
      <div className="px-5 pb-4">
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs opacity-70">{done}/{total} ({pct}%)</div>
      </div>
    </section>
  );
}
