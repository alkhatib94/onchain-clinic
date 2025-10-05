// app/badges/Badge.tsx
"use client";

type Item = { title: string; desc?: string; ok: boolean };
type Progress = { done: number; total: number };

export default function Badge({
  title,
  statRight,
  items = [],       // 👈 افتراضي آمن
  progress,
}: {
  title: string;
  statRight?: string;
  items?: Item[];
  progress?: Progress;
}) {
  const done = items.filter((i) => i.ok).length;
  const total = items.length || (progress?.total ?? 0);
  const pct = total > 0 ? Math.round(((progress?.done ?? done) / total) * 100) : 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="text-[15px] font-semibold">{title}</div>
        {statRight ? <div className="text-sm opacity-70">{statRight}</div> : null}
      </div>

      {/* Items */}
      <div className="p-5 space-y-4 flex-1">
        {items.map((it, i) => (
          <div
            key={i}
            className={[
              "px-4 py-3 rounded-xl border flex items-start gap-3 transition-colors",
              it.ok
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-rose-500/10 border-rose-500/30",
            ].join(" ")}
          >
            <div
              className={[
                "w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-sm font-bold",
                it.ok
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40",
              ].join(" ")}
            >
              {it.ok ? "✓" : "✕"}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{it.title}</div>
              {it.desc ? <div className="text-xs opacity-70">{it.desc}</div> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="px-5 pb-5">
          <div className="mb-2 flex items-center justify-between text-xs opacity-75">
            <span>Progress</span>
            <span className="md:hidden">
              {(progress?.done ?? done)}/{total} ({pct}%)
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-white/8 overflow-hidden">
            <div className="absolute inset-0 opacity-40 bg-gradient-to-r from-emerald-400/30 via-sky-400/30 to-violet-400/30" />
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-medium">
              {(progress?.done ?? done)}/{total} ({pct}%)
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
