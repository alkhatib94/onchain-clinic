// app/badges/PrescriptionUsage.tsx
"use client";

type Props = {
  swaps: number;
  stablecoinTxs: number;
  usdcTrades: number;
  stablecoinTypes: number;
  maxSwapUsd: number;
};

export default function PrescriptionUsage({
  swaps = 0,
  stablecoinTxs = 0,
  usdcTrades = 0,
  stablecoinTypes = 0,
  maxSwapUsd = 0,
}: Props) {
  // الشروط (كما هي عندك)
  const items = [
    {
      title: "First Prescription",
      desc: "≥ 3 swaps",
      ok: swaps >= 3,
    },
    {
      title: "Stable Dose",
      desc: "≥ 3 stablecoin txs",
      ok: stablecoinTxs >= 3,
    },
    {
      title: "USDC Therapy",
      desc: "≥ 3 USDC trades",
      ok: usdcTrades >= 3,
    },
    {
      title: "Multi-Prescription",
      desc: "≥ 3 different stablecoins",
      ok: stablecoinTypes >= 3,
    },
    {
      title: "Long-Term Medication",
      desc: "≥ 50 swaps",
      ok: swaps >= 50,
    },
    {
      title: "Critical Treatment",
      desc: "≥ $10,000 single swap",
      ok: maxSwapUsd >= 10_000,
    },
  ];

  const done = items.filter((i) => i.ok).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="text-[15px] font-semibold">Prescription Usage</div>
        <div className="text-sm opacity-70">Swaps: {swaps}</div>
      </div>

      {/* Items */}
      <div className="p-5 space-y-4 flex-1">
        {items.map((it, idx) => (
          <div
            key={idx}
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
              <div className="text-xs opacity-70">{it.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="px-5 pb-5">
        <div className="mb-2 flex items-center justify-between text-xs opacity-75">
          <span>Progress</span>
          {/* ننقل النص داخل الخط أيضاً، لكن نخليه هنا fallback على الشاشات الصغيرة */}
          <span className="md:hidden">{done}/{total} ({pct}%)</span>
        </div>
        <div className="relative h-3 rounded-full bg-white/8 overflow-hidden">
          {/* الخلفية */}
          <div className="absolute inset-0 opacity-40 bg-gradient-to-r from-emerald-400/30 via-sky-400/30 to-violet-400/30" />
          {/* المؤشر */}
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
          {/* النص داخل الخط */}
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-medium">
            {done}/{total} ({pct}%)
          </div>
        </div>
      </div>
    </section>
  );
}
