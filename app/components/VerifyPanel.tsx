// app/components/VerifyPanel.tsx
"use client";

type Diag = {
  total_ms?: number;
  statuses?: Record<string, string>;
  counts?: { normal: number; erc20: number; erc721: number; internals: number };
  swapHashes?: string[];
  bridgeHits?: Record<string, number>;
  dexHits?: Record<string, number>;
} | null;

export default function VerifyPanel({ summary }: { summary: any }) {
  const diag: Diag = summary?._diag ?? null;

  if (!diag) return null;

  const issues: string[] = [];

  // مثال فحص: لو swaps بعيدة عن عدد swapHashes
  if (typeof summary?.swaps === "number" && Array.isArray(diag.swapHashes)) {
    const approx = diag.swapHashes.length;
    if (approx && Math.abs(summary.swaps - approx) > 2) {
      issues.push(`Swaps mismatch: UI=${summary.swaps}, diag≈${approx}`);
    }
  }

  // مثال: طرف ثالث مفعّل ولكن لا يوجد bridgeHits
  if (summary?.usedThirdPartyBridge && diag.bridgeHits) {
    const sum = Object.values(diag.bridgeHits).reduce((a, b) => a + Number(b || 0), 0);
    if (!sum) issues.push("Third-party bridge flagged but counts=0");
  }

  return (
    <div className="mt-4 rounded-xl border border-neutral-700 bg-neutral-900/60 p-4 text-sm">
      <div className="flex items-center justify-between">
        <strong>Verification</strong>
        <span className={issues.length ? "text-amber-400" : "text-green-400"}>
          {issues.length ? "⚠️ Issues found" : "✅ Verified"}
        </span>
      </div>

      {issues.length > 0 && (
        <ul className="mt-2 list-disc ps-6 text-amber-300">
          {issues.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div>
          <div className="opacity-70">Fetch time</div>
          <div>{diag.total_ms ? `${diag.total_ms} ms` : "—"}</div>
        </div>
        <div>
          <div className="opacity-70">Tx counts</div>
          <div>
            normal: {diag.counts?.normal ?? 0} • erc20: {diag.counts?.erc20 ?? 0} • erc721:{" "}
            {diag.counts?.erc721 ?? 0} • internals: {diag.counts?.internals ?? 0}
          </div>
        </div>
        <div>
          <div className="opacity-70">Swaps sample</div>
          <div className="break-all">
            {(diag.swapHashes ?? []).slice(0, 4).map((h) => (
              <a
                key={h}
                className="me-2 underline"
                href={`https://basescan.org/tx/${h}`}
                target="_blank"
                rel="noreferrer"
              >
                {h.slice(0, 10)}…
              </a>
            ))}
            {(diag.swapHashes?.length ?? 0) > 4 ? "…" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
