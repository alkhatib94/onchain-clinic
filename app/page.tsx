// app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { brand } from "@/config/brand";
import Header from "./components/Header";
import WalletBar from "./components/WalletBar";
import MainReportTable from "./components/MainReportTable";
import BadgesGrid from "./badges/BadgesGrid";

// نظام الصحة الشامل + كروت التشخيص/الملخص
import { computeHealth } from "@/app/lib/healthScore";
import FinalDiagnosisCard from "@/components/FinalDiagnosisCard";
import DoctorSummary from "@/components/DoctorSummary";

// NEW: ErrorBoundary
import ErrorBoundary from "./components/ErrorBoundary";

/* ========= Types ========= */
type DeployedBreakdown = {
  direct?: number;
  internal?: number;
  sample?: string[];
};

type SummaryDiag = {
  total_ms?: number;
  statuses?: Record<string, string>;
  counts?: { normal: number; erc20: number; erc721: number; internals: number };
  swapHashes?: string[];
  bridgeHits?: Record<string, number>;
  dexHits?: Record<string, number>;
  deployed?: DeployedBreakdown;
};

type Summary = {
  address: string;
  baseEns: string | null;
  balanceEth: number;
  volume: { eth: number; ethUsd: number; usdTotal: number; usdcAmount: number };
  nativeTxs: number;
  tokenTxs: number;
  walletAgeDays: number;
  uniqueDays: number;
  uniqueWeeks: number;
  uniqueMonths: number;
  contracts: { totalInteractions: number; uniqueInteractions: number };
  bridge: { depositedEth: number; depositedUsd: number; nativeBridgeUsed: boolean };
  thresholds: Record<string, boolean>;
  allTxTimestampsUTC?: string[];
  mainnetLaunchUTC?: string;
  holidayDatesUTC?: string[];

  swaps?: number;
  stablecoinTxs?: number;
  usdcTrades?: number;
  stablecoinTypes?: number;
  maxSwapUsd?: number;

  erc20Count?: number;
  nftCount?: number;

  totalVolumeEth?: number;
  gasEth?: number;

  usedThirdPartyBridge?: boolean;
  usedNativeBridge?: boolean;
  relayCount?: number;
  jumperCount?: number;
  bungeeCount?: number;
  acrossCount?: number;

  deployedContracts?: number;

  // special clinics
  uniswap?: number;
  sushi?: number;
  pancake?: number;
  aerodrome?: number;
  aave?: number;
  limitless?: number;
  stargate?: number;
  metamask?: number;
  lendingAny?: boolean;
  matcha?: number;

  _diag?: SummaryDiag;
};

function isSummary(x: any): x is Summary {
  return x && typeof x === "object" && "volume" in x && "contracts" in x && "walletAgeDays" in x;
}

/** فحص مبكّر للإدخال لتجنّب أي طلب غير صالح */
const isLikelyAddrOrBasename = (x: string) =>
  /^0x[0-9a-fA-F]{40}$/.test(x) || /\.base\.eth$/i.test(x);

export default function Home() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // مفتاح التحقق
  const [verify, setVerify] = useState<boolean>(false);

  // للتحكم في السباقات + تذكر آخر عنوان
  const ctrlRef = useRef<AbortController | null>(null);
  const lastAddrRef = useRef<string>("");

  // قراءة ?address و ?verify من الرابط بعد الـ mount
  const [initial, setInitial] = useState<string>("");
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const a = (sp.get("address") || "").trim();
      if (a) setInitial(a);
      const v = sp.get("verify");
      if (v === "1" || v === "true") setVerify(true);
    } catch {}
  }, []);

  // تشغيل تلقائي إذا كان العنوان موجود بالرابط
  useEffect(() => {
    if (initial && initial.toLowerCase() !== lastAddrRef.current.toLowerCase()) {
      run(initial, verify);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const run = async (addr: string, withVerify?: boolean) => {
    const clean = (addr || "").trim();
    setError(null);

    if (!clean) {
      setError("Please enter your wallet address or basename.");
      return;
    }

    // فحص صحة الإدخال (0x… أو name.base.eth)
    if (!isLikelyAddrOrBasename(clean)) {
      setError("Enter a valid 0x… address or name.base.eth");
      return;
    }

    // لا تعيد الجلب إذا نفس العنوان والبيانات موجودة
    if (clean.toLowerCase() === lastAddrRef.current.toLowerCase() && data && withVerify === undefined) return;
    lastAddrRef.current = clean;

    // ألغِ أي طلب سابق
    if (ctrlRef.current) ctrlRef.current.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    // حدّث URL بهدوء
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("address", clean);
      if (withVerify ?? verify) u.searchParams.set("verify", "1");
      else u.searchParams.delete("verify");
      window.history.replaceState(null, "", u.pathname + "?" + u.searchParams.toString());
    } catch {}

    const timeout = setTimeout(() => ctrl.abort(), 30000);

    try {
      setLoading(true);

      const apiUrl = new URL("/api/summary", window.location.origin);
      apiUrl.searchParams.set("address", clean);
      if (withVerify ?? verify) apiUrl.searchParams.set("debug", "diag");

      const r = await fetch(apiUrl.toString(), { cache: "no-store", signal: ctrl.signal });

      let j: any = null;
      try {
        j = await r.clone().json();
      } catch {
        const raw = await r.text();
        if (!r.ok) {
          setError(raw || r.statusText || "Unexpected API response");
          return;
        }
      }

      if (!r.ok || !isSummary(j)) {
        setError(j?.error || "Unexpected API response");
        return;
      }

      setData(j);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || "Network error");
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const s: Summary | null = data && isSummary(data) ? data : null;

  // صفوف التقرير الرئيسي (دائمًا مصفوفة — آمن)
  const rows = [
    { name: "Base ENS", value: s?.baseEns ?? "N/A" },
    { name: "Wallet age", value: s ? `${s.walletAgeDays.toLocaleString()} Days` : "N/A" },
    { name: "Balance", value: s ? `${round6(s.balanceEth)} ETH` : "N/A" },
    { name: "Volume (ETH / USD)", value: s ? `${round6(s.volume.eth)} / $${fmt2(s.volume.ethUsd)}` : "N/A" },
    { name: "Native TXs", value: s ? `${s.nativeTxs.toLocaleString()}` : "N/A" },
    { name: "Token TXs", value: s ? `${s.tokenTxs.toLocaleString()}` : "N/A" },
    {
      name: "Unique days / weeks / months",
      value: s ? `${s.uniqueDays} / ${s.uniqueWeeks} / ${s.uniqueMonths}` : "N/A",
    },
    {
      name: "Contracts (total / unique)",
      value: s ? `${s.contracts.totalInteractions} / ${s.contracts.uniqueInteractions}` : "N/A",
    },
  ];

  const txCount = (s?.nativeTxs ?? 0) + (s?.tokenTxs ?? 0);

  // حساب الصحة الشاملة (آمن)
  const health = computeHealth({
    walletAgeDays: s?.walletAgeDays ?? 0,
    nativeTxs: s?.nativeTxs ?? 0,
    tokenTxs: s?.tokenTxs ?? 0,

    // diversity
    contracts: {
      totalInteractions: s?.contracts?.totalInteractions ?? 0,
      uniqueInteractions: s?.contracts?.uniqueInteractions ?? 0,
    },
    erc20Count: s?.erc20Count ?? 0,
    nftCount: s?.nftCount ?? 0,

    // usage
    swaps: s?.swaps ?? 0,
    stablecoinTxs: s?.stablecoinTxs ?? 0,
    usdcTrades: s?.usdcTrades ?? 0,
    stablecoinTypes: s?.stablecoinTypes ?? 0,
    maxSwapUsd: s?.maxSwapUsd ?? 0,

    // حجم ETH الفعلي
    volumeEth: s?.volume.eth ?? s?.totalVolumeEth ?? 0,

    // deployment
    deployedContracts: s?.deployedContracts ?? 0,

    // special clinics bonus
    uniswap: s?.uniswap ?? 0,
    aerodrome: s?.aerodrome ?? 0,
    aave: s?.aave ?? 0,
    stargate: s?.stargate ?? 0,
    metamask: s?.metamask ?? 0,
    matcha: s?.matcha ?? 0,
    lendingAny: s?.lendingAny ?? false,

    // لحالات نقص الـ timestamps
    allTxTimestampsUTC: s?.allTxTimestampsUTC ?? [],
    fallbackActiveDays: s?.uniqueDays ?? 0,
  });

  // شكل موحّد (لو فعّلت الرادار لاحقًا)
  type RadarAreas = {
    history: number;
    activity: number;
    variety: number;
    usage: number;
    costs: number;
    deployment: number;
    clinics: number;
    lifestyle: number;
  };
  const radarAreas: RadarAreas = {
    history: (health as any)?.areas?.history ?? 0,
    activity: (health as any)?.areas?.activity ?? 0,
    variety: (health as any)?.areas?.variety ?? (health as any)?.areas?.diversity ?? 0,
    usage: (health as any)?.areas?.usage ?? 0,
    costs: (health as any)?.areas?.costs ?? 0,
    deployment: (health as any)?.areas?.deployment ?? 0,
    clinics: (health as any)?.areas?.clinics ?? 0,
    lifestyle: (health as any)?.areas?.lifestyle ?? 0,
  };

  // ===== لوحة تحقق مصغّرة (Inline) =====
  const VerifyPanelInline = ({ summary }: { summary: Summary }) => {
    const diag = summary?._diag;
    if (!diag) return null;

    const issues: string[] = [];

    // فرق واضح بين swaps و swapHashes
    if (typeof summary.swaps === "number" && Array.isArray(diag.swapHashes)) {
      const approx = diag.swapHashes.length;
      if (approx && Math.abs(summary.swaps - approx) > 2) {
        issues.push(`Swaps mismatch: UI=${summary.swaps}, diag≈${approx}`);
      }
    }

    // طرف ثالث مفعّل بدون عدادات
    if (summary.usedThirdPartyBridge && diag.bridgeHits) {
      const sum = Object.values(diag.bridgeHits).reduce((a: number, b: any) => a + Number(b || 0), 0);
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
              {(diag.swapHashes ?? []).slice(0, 4).map((h: string) => (
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
  };

  return (
    <main className={`${brand.bg} ${brand.text} min-h-screen p-6`}>
      <div className="max-w-6xl mx-auto">
        <Header />

        {/* شريط المحفظة + مفتاح Verify */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <WalletBar onCheck={(a: string) => run(a, verify)} loading={loading} />
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              checked={verify}
              onChange={(e) => setVerify(e.target.checked)}
              disabled={loading}
            />
            Verify data
          </label>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-rose-500/40 bg-rose-500/10">
            {String(error)}
          </div>
        )}

        {/* التقرير الرئيسي */}
        <ErrorBoundary name="MainReportTable">
          <div className="mb-6">
            <MainReportTable
              rows={rows}
              verify={verify}
              address={s?.address}
              diagCounts={s?._diag?.counts ?? null}
            />
          </div>
        </ErrorBoundary>

        {/* الكروت */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <ErrorBoundary name="FinalDiagnosisCard">
            <FinalDiagnosisCard
              score={health.score}
              level={health.level}
              emoji={health.emoji}
              strongest={health.strongest}
              weakest={health.weakest}
              onMint={async () => {
                await new Promise((res) => setTimeout(res, 600));
              }}
            />
          </ErrorBoundary>

          <ErrorBoundary name="DoctorSummary">
            <DoctorSummary
              score={health.score}
              level={health.level}
              strongest={health.strongest}
              weakest={health.weakest}
            />
          </ErrorBoundary>
        </div>

        {/* شبكة البادجات */}
        <ErrorBoundary name="BadgesGrid">
          <BadgesGrid
            walletAge={s?.walletAgeDays ?? 0}
            txCount={txCount}
            activeDays={s?.uniqueDays ?? 0}
            txTimestampsUTC={s?.allTxTimestampsUTC ?? []}
            mainnetLaunchUTC={s?.mainnetLaunchUTC ?? "2023-08-09T00:00:00Z"}
            holidayDatesUTC={s?.holidayDatesUTC ?? []}
            uniqueContracts={s?.contracts?.uniqueInteractions ?? 0}
            totalVolumeEth={s?.volume.eth ?? 0}
            gasEth={s?.gasEth ?? 0}
            swaps={s?.swaps ?? 0}
            stablecoinTxs={s?.stablecoinTxs ?? 0}
            usdcTrades={s?.usdcTrades ?? 0}
            stablecoinTypes={s?.stablecoinTypes ?? 0}
            maxSwapUsd={s?.maxSwapUsd ?? 0}
            erc20Count={s?.erc20Count ?? 0}
            nftCount={s?.nftCount ?? 0}
            usedThirdPartyBridge={s?.usedThirdPartyBridge ?? false}
            usedNativeBridge={s?.usedNativeBridge ?? false}
            relayCount={s?.relayCount ?? 0}
            jumperCount={s?.jumperCount ?? 0}
            bungeeCount={s?.bungeeCount ?? 0}
            acrossCount={s?.acrossCount ?? 0}
            deployedContracts={s?.deployedContracts ?? 0}
            uniswap={s?.uniswap ?? 0}
            aerodrome={s?.aerodrome ?? 0}
            aave={s?.aave ?? 0}
            stargate={s?.stargate ?? 0}
            metamask={s?.metamask ?? 0}
            lendingAny={s?.lendingAny ?? false}
            matcha={s?.matcha ?? 0}
          />
        </ErrorBoundary>

        {/* لوحة تحقق داخلية (تظهر فقط عند ?debug=diag) */}
        {s?._diag && (
          <ErrorBoundary name="VerifyPanelInline">
            <VerifyPanelInline summary={s} />
          </ErrorBoundary>
        )}
      </div>
    </main>
  );
}

const round6 = (n: number) => String(Math.round((n || 0) * 1e6) / 1e6);
const fmt2 = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
