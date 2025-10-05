// app/badges/Referrals.tsx
"use client";

type Props = {
  usedThirdPartyBridge: boolean;
  usedNativeBridge: boolean;
  relayCount: number;
  jumperCount: number;
  bungeeCount: number;
  acrossCount: number;
};

export default function Referrals({
  usedThirdPartyBridge,
  usedNativeBridge,
  relayCount = 0,
  jumperCount = 0,
  bungeeCount = 0,
  acrossCount = 0,
}: Props) {
  const items = [
    { title: "Third-party Referral", desc: "Used 3rd party bridge", ok: !!usedThirdPartyBridge },
    { title: "Native Referral", desc: "Used official Base bridge", ok: !!usedNativeBridge },
    { title: "Relay Checkup", desc: "Relay ≥ 3", ok: relayCount >= 3 },
    { title: "Jumper Checkup", desc: "Jumper ≥ 3", ok: jumperCount >= 3 },
    { title: "Bungee Checkup", desc: "Bungee ≥ 3", ok: bungeeCount >= 3 },
    { title: "Across Checkup", desc: "Across ≥ 3", ok: acrossCount >= 3 },
  ];

  const done = items.filter((i) => i.ok).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="text-[15px] font-semibold">Referrals</div>
        
        <div className="text-sm opacity-70">
          Relays: {relayCount},Jumpers: {jumperCount}, Bungees: {bungeeCount}, Across: {acrossCount}
        </div>
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
          <span className="md:hidden">
            {done}/{total} ({pct}%)
          </span>
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
