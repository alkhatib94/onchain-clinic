// app/badges/OnchainLifestyle.tsx
"use client";

type Props = {
  /** ISO timestamps (UTC) لكل المعاملات */
  txTimestampsUTC?: string[];
  /** تاريخ إطلاق الشبكة (UTC) – يُستخدم لحساب First Admission */
  mainnetLaunchUTC?: string;
  /** تواريخ العطل كـ yyyy-mm-dd (UTC) */
  holidayDatesUTC?: string[];
};

/* ---------- Helpers ---------- */

function isValidDate(d: Date) {
  return !Number.isNaN(+d);
}

function inRangeUTC(d: Date, h0: number, h1: number) {
  const h = d.getUTCHours();
  return h >= h0 && h < h1;
}

function ymdUTC(d: Date) {
  return d.toISOString().slice(0, 10); // yyyy-mm-dd
}

function mmddUTC(d: Date) {
  const iso = d.toISOString();
  return iso.slice(5, 10); // mm-dd
}

/* ---------- Component ---------- */

export default function OnchainLifestyle({
  txTimestampsUTC = [],
  mainnetLaunchUTC = "2023-08-09T00:00:00Z",
  holidayDatesUTC = [],
}: Props) {
  // Normalize inputs safely
  const dates: Date[] = (Array.isArray(txTimestampsUTC) ? txTimestampsUTC : [])
    .map((s) => new Date(String(s)))
    .filter(isValidDate);

  const holidays = new Set(
    (Array.isArray(holidayDatesUTC) ? holidayDatesUTC : []).map((s) =>
      String(s).slice(0, 10),
    ),
  );

  // 1) Morning Checkup: any tx between 06–09 UTC
  const morning = dates.some((d) => inRangeUTC(d, 6, 9));

  // 2) Night Shift: any tx between 00–06 UTC
  const night = dates.some((d) => inRangeUTC(d, 0, 6));

  // 3) First Admission: interacted in first week of mainnet
  let firstAdmission = false;
  const launch = new Date(mainnetLaunchUTC);
  if (isValidDate(launch)) {
    const weekEnd = new Date(launch.getTime() + 7 * 86400000);
    firstAdmission = dates.some((d) => d >= launch && d < weekEnd);
  }

  // 4) Doctor’s Day Rounds: any tx on March 30 (any year, UTC)
  const doctorsDay = dates.some((d) => mmddUTC(d) === "03-30");

  // 5) Emergency Case: any tx on a global holiday (provided list)
  const activeDays = new Set(dates.map(ymdUTC));
  const holidayHit = Array.from(activeDays).some((d) => holidays.has(d));

  // 6) Intensive Care: 10+ transactions in one UTC day
  const perDayCount = new Map<string, number>();
  for (const d of dates) {
    const key = ymdUTC(d);
    perDayCount.set(key, (perDayCount.get(key) || 0) + 1);
  }
  const intensiveCare = Array.from(perDayCount.values()).some((n) => n >= 10);

  // Items (exactly like the screenshot)
  const items = [
    { title: "Morning Checkup", desc: "Transaction between 6–9am UTC", ok: morning },
    { title: "Night Shift", desc: "Transaction between 00–06am UTC", ok: night },
    { title: "First Admission", desc: "Interacted in first week of mainnet", ok: firstAdmission },
    { title: "Doctor’s Day Rounds", desc: "Transaction on March 30", ok: doctorsDay },
    { title: "Emergency Case", desc: "Transaction on a global holiday", ok: holidayHit },
    { title: "Intensive Care", desc: "10+ transactions in one UTC day", ok: intensiveCare },
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
