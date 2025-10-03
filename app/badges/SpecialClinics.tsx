// app/badges/SpecialClinics.tsx
"use client";

type Props = {
  uniswap?: number;
  aerodrome?: number;
  aave?: number;
  stargate?: number;
  metamask?: number;
  lendingAny?: boolean;
  matcha?: number;
};

export default function SpecialClinics({
  uniswap = 0,
  aerodrome = 0,
  aave = 0,
  stargate = 0,
  metamask = 0,
  lendingAny = false,
  matcha = 0,
}: Props) {
  // العناصر المعتمدة فقط (بدون Sushi / Pancake / Limitless)
  const items = [
    { title: "Uniswap Ward",   desc: "Uniswap ≥ 3",                ok: uniswap   >= 3 },
    { title: "Aerodrome Ward", desc: "Aerodrome ≥ 3",              ok: aerodrome >= 3 },
    { title: "Aave Ward",      desc: "Aave ≥ 3",                   ok: aave      >= 3 },
    { title: "Stargate Ward",  desc: "Stargate ≥ 3",               ok: stargate  >= 3 },
    { title: "Metamask Ward",  desc: "Metamask Swap/Bridge ≥ 3",   ok: metamask  >= 3 },
    { title: "Lending Ward",   desc: "Lending protocols used",     ok: !!lendingAny },
    { title: "Matcha Ward",    desc: "Matcha.xyz ≥ 3",             ok: matcha    >= 3 },
  ];

  const done  = items.filter(i => i.ok).length;
  const total = items.length;
  const pct   = Math.round((done / total) * 100);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="text-[15px] font-semibold">Special Clinics</div>
        <div className="text-sm opacity-70">Protocols hit: {done}/{total}</div>
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
          <span className="md:hidden">{done}/{total} ({pct}%)</span>
        </div>
        <div className="relative h-3 rounded-full bg-white/8 overflow-hidden">
          {/* خلفية خفيفة */}
          <div className="absolute inset-0 opacity-40 bg-gradient-to-r from-emerald-400/30 via-sky-400/30 to-violet-400/30" />
          {/* المؤشر */}
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
          {/* النص داخل البار */}
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-medium">
            {done}/{total} ({pct}%)
          </div>
        </div>
      </div>
    </section>
  );
}
