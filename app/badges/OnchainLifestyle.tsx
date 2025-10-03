// app/badges/OnchainLifestyle.tsx
"use client";

type Props = {
  txTimestampsUTC: string[];
  mainnetLaunchUTC: string;
  holidayDatesUTC: string[];
};

function inRangeUTC(d: Date, h0: number, h1: number) {
  const h = d.getUTCHours();
  return h >= h0 && h < h1;
}

export default function OnchainLifestyle({
  txTimestampsUTC = [],
  mainnetLaunchUTC,
  holidayDatesUTC = [],
}: Props) {
  const dates = (txTimestampsUTC || []).map((s) => new Date(s));
  const anyMorning = dates.some((d) => inRangeUTC(d, 6, 9));
  const anyNight = dates.some((d) => inRangeUTC(d, 0, 6));

  const m0 = new Date(mainnetLaunchUTC);
  const m7 = new Date(m0.getTime() + 7 * 86400000);
  const firstWeek = dates.some((d) => d >= m0 && d < m7);

  const holidays = new Set(holidayDatesUTC || []);
  const onHoliday = (txTimestampsUTC || []).some((iso) =>
    holidays.has(iso.slice(0, 10))
  );

  // 10+ txs في يوم UTC واحد
  const byDay: Record<string, number> = {};
  for (const iso of txTimestampsUTC || []) {
    const day = iso.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }
  const day10 = Object.values(byDay).some((c) => c >= 10);

  const items = [
    { title: "Morning Checkup", desc: "Transaction between 6–9am UTC", ok: anyMorning },
    { title: "Night Shift", desc: "Transaction between 00–06am UTC", ok: anyNight },
    { title: "First Admission", desc: "Interacted in first week of mainnet", ok: firstWeek },
    { title: "Doctor’s Day Rounds", desc: "Transaction on March 30", ok: onHoliday },
    { title: "Emergency Case", desc: "Transaction on a global holiday", ok: onHoliday },
    { title: "Intensive Care", desc: "10+ transactions in one UTC day", ok: day10 },
  ];

  const done = items.filter((i) => i.ok).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="text-[15px] font-semibold">Onchain Lifestyle</div>
        <div className="text-sm opacity-70">Events: {done}/{total}</div>
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
          <div className="absolute inset-0 opacity-40 bg-gradient-to-r from-emerald-400/30 via-sky-400/30 to-violet-400/30" />
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-medium">
            {done}/{total} ({pct}%)
          </div>
        </div>
      </div>
    </section>
  );
}
