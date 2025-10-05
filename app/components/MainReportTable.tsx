// app/components/MainReportTable.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";

type Row = { name: string; value: string; hint?: string };

type DiagCounts = {
  normal: number;
  erc20: number;
  erc721: number;
  internals: number;
};

type Props = {
  rows?: Row[];
  /** لتفعيل شريط التحقق */
  verify?: boolean;
  /** لعمل روابط مباشرة إلى Basescan */
  address?: string;
  /** عدّادات خام من الـ API عندما تستدعي /api/summary?debug=diag */
  diagCounts?: DiagCounts | null;
};

export default function MainReportTable({
  rows = [],
  verify = false,
  address,
  diagCounts,
}: Props) {
  const isEmpty = rows.length === 0;

  // تجهيز روابط سريعة للتحقق من المصدر (Basescan)
  const links = useMemo(() => {
    if (!address) return null;
    const addr = address.toLowerCase();
    return {
      native: `https://basescan.org/txs?a=${addr}`,
      erc20: `https://basescan.org/txs?f=2&a=${addr}`, // Token Transfers (ERC-20)
      erc721: `https://basescan.org/txs?f=3&a=${addr}`, // NFT (ERC-721)
      account: `https://basescan.org/address/${addr}`,
    };
  }, [address]);

  // مضاهاة سريعة بين القيم المعروضة وما أعاده التشخيص الخام
  // (نبحث عن القيم داخل rows بالاسم؛ لو تغيّرت التسميات عدل المطابقة أدناه)
  const mismatch = useMemo(() => {
    if (!verify || !diagCounts) return null;

    const getNum = (label: string) => {
      const r = rows.find((x) => x.name.toLowerCase().includes(label));
      if (!r) return null;
      const m = (r.value || "").match(/[\d,]+/g);
      if (!m || !m[0]) return null;
      return Number(m[0].replace(/,/g, ""));
    };

    const uiNative = getNum("native");
    const uiToken = getNum("token");
    // عقود (total / unique) لن نقارنها هنا لأنها تُحسب بمنهجية مختلفة

    const issues: string[] = [];
    if (uiNative != null && uiNative !== diagCounts.normal) {
      issues.push(`Native TXs UI=${uiNative} vs raw=${diagCounts.normal}`);
    }
    if (uiToken != null && uiToken !== diagCounts.erc20 + diagCounts.erc721) {
      issues.push(
        `Token TXs UI=${uiToken} vs raw=${diagCounts.erc20 + diagCounts.erc721}`
      );
    }

    return {
      ok: issues.length === 0,
      issues,
    };
  }, [verify, diagCounts, rows]);

  return (
    <section className="bg-slate-900/60 rounded-2xl p-6 shadow-md border border-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Main Report</h2>

        {verify && (
          <div
            className={[
              "text-xs px-2.5 py-1 rounded-md border",
              mismatch?.ok
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300",
            ].join(" ")}
            title={
              mismatch?.ok
                ? "Numbers match raw counters from the diagnostic payload."
                : (mismatch?.issues || []).join(" • ")
            }
          >
            {mismatch?.ok ? "Verified ✓" : "Check differences ⚠️"}
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="text-slate-400 text-sm italic">
          No data yet. Enter a valid address (0x...) or basename (name.base.eth) and
          press Check.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-slate-800/40 rounded-lg px-4 py-3 hover:bg-slate-800/70 transition group"
              title={row.hint || ""}
            >
              <span className="text-slate-300 font-medium flex items-center gap-2">
                {row.name}
                {/* روابط تحقق صغيرة بحسب البند */}
                {verify && address && (
                  <PerRowLink
                    label={row.name}
                    links={links}
                    diagCounts={diagCounts || undefined}
                  />
                )}
              </span>
              <span className="text-white font-semibold">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* شريط روابط عام أسفل الجدول (عندما يكون verify مفعّل) */}
      {verify && links && (
        <div className="mt-4 text-xs text-slate-400 flex flex-wrap gap-3">
          <span className="opacity-70">Verify on:</span>
          <a
            className="underline hover:text-slate-200"
            href={links.account}
            target="_blank"
            rel="noreferrer"
          >
            Basescan (address)
          </a>
          <a
            className="underline hover:text-slate-200"
            href={links.native}
            target="_blank"
            rel="noreferrer"
          >
            Native TXs
          </a>
          <a
            className="underline hover:text-slate-200"
            href={links.erc20}
            target="_blank"
            rel="noreferrer"
          >
            ERC-20 transfers
          </a>
          <a
            className="underline hover:text-slate-200"
            href={links.erc721}
            target="_blank"
            rel="noreferrer"
          >
            ERC-721 transfers
          </a>
        </div>
      )}
    </section>
  );
}

/* ---------- زر رابط صغير يظهر بجانب عنوان كل صف ---------- */

function PerRowLink({
  label,
  links,
  diagCounts,
}: {
  label: string;
  links: {
    native: string;
    erc20: string;
    erc721: string;
    account: string;
  } | null;
  diagCounts?: DiagCounts;
}) {
  if (!links) return null;

  const L = label.toLowerCase();
  let href: string | null = null;
  let title = "Open in Basescan";

  if (L.includes("native")) {
    href = links.native;
    if (diagCounts) title = `Raw native txs: ${diagCounts.normal}`;
  } else if (L.includes("token")) {
    href = links.erc20; // أقرب رابط متاح عام (معظم مزوّدي الفلترة يعرضون ERC-20)
    if (diagCounts)
      title = `Raw token transfers (erc20+erc721): ${
        diagCounts.erc20 + diagCounts.erc721
      }`;
  } else if (L.includes("balance") || L.includes("volume") || L.includes("wallet")) {
    href = links.account;
  } else if (L.includes("contract")) {
    href = links.account;
  }

  if (!href) return null;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="opacity-60 group-hover:opacity-100 underline decoration-dotted underline-offset-4"
      title={title}
      aria-label="Verify on Basescan"
    >
      verify
    </Link>
  );
}
