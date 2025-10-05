"use client";

type Breakdown = {
  direct?: number;
  internal?: number;
  receipt?: number;
  sample?: string[];
};

type Props = {
  /** إجمالي عدد العقود المنشورة (يجي من الـ API) */
  deployedContracts?: number;
  /** تفاصيل تفصيلية من _diag.deployed */
  breakdown?: Breakdown;
};

export default function MedicalStaff({ deployedContracts = 0, breakdown }: Props) {
  const totalDeployed = Math.max(0, Number(deployedContracts) || 0);

  const direct = breakdown?.direct ?? 0;
  const internal = breakdown?.internal ?? 0;
  const receipt = breakdown?.receipt ?? 0;

  const totalReported = direct + internal + receipt;

  const items = [
    { title: "Resident I",       desc: "Deploy ≥ 3 contracts",    ok: totalDeployed >= 3 },
    { title: "Resident II",      desc: "Deploy ≥ 5 contracts",    ok: totalDeployed >= 5 },
    { title: "Resident III",     desc: "Deploy ≥ 10 contracts",   ok: totalDeployed >= 10 },
    { title: "Senior Resident",  desc: "Deploy ≥ 20 contracts",   ok: totalDeployed >= 20 },
    { title: "Attending Doctor", desc: "Deploy ≥ 50 contracts",   ok: totalDeployed >= 50 },
    { title: "Chief Surgeon",    desc: "Deploy ≥ 100 contracts",  ok: totalDeployed >= 100 },
  ];

  const done = items.filter((i) => i.ok).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="text-[15px] font-semibold">Medical Staff</div>
        <div className="text-sm opacity-80">
          Deployed: {totalDeployed}
          {totalReported > 0 && (
            <span className="text-xs opacity-60 ms-2">
              ({direct}/{internal}/{receipt})
            </span>
          )}
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

        {/* Breakdown Section */}
        {breakdown && (
          <div className="mt-5 text-xs text-slate-300 space-y-1 border-t border-white/10 pt-3">
            <div className="opacity-80 font-semibold">Breakdown:</div>
            <div>• Direct deploys: {direct}</div>
            <div>• Internal (factory/create2): {internal}</div>
            <div>• From receipts: {receipt}</div>

            {breakdown.sample && breakdown.sample.length > 0 && (
              <div className="mt-2">
                <div className="opacity-80 mb-1">Sample contracts:</div>
                <ul className="max-h-24 overflow-y-auto space-y-1">
                  {breakdown.sample.slice(0, 10).map((addr, i) => (
                    <li key={i}>
                      <a
                        href={`https://basescan.org/address/${addr}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-blue-400 hover:text-blue-300 break-all"
                      >
                        {addr}
                      </a>
                    </li>
                  ))}
                  {breakdown.sample.length > 10 && (
                    <li className="opacity-50">… +{breakdown.sample.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
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
