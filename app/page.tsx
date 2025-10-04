// app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { brand } from "@/config/brand";
import Header from "./components/Header";
import WalletBar from "./components/WalletBar";
import MainReportTable from "./components/MainReportTable";
import BadgesGrid from "./badges/BadgesGrid";

// نظام الصحة الشامل + كروت التشخيص/الملخص
import { computeHealth } from "@/app/lib/healthScore";
import FinalDiagnosisCard from "@/components/FinalDiagnosisCard";
import DoctorSummary from "@/components/DoctorSummary";

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
};

function isSummary(x: any): x is Summary {
  return x && typeof x === "object" && "volume" in x && "contracts" in x && "walletAgeDays" in x;
}

export default function Home() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // لإلغاء أي طلب سابق وتجنّب السباقات
  const ctrlRef = useRef<AbortController | null>(null);
  const lastAddrRef = useRef<string>("");

  // اقرأ ?address من الرابط بعد mount (بدون useSearchParams)
  const [initial, setInitial] = useState<string>("");
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const a = (sp.get("address") || "").trim();
      if (a) setInitial(a);
    } catch {}
    // لا dependencies
  }, []);

  // شغّل تلقائيًا إذا فيه عنوان بالرابط
  useEffect(() => {
    if (initial && initial.toLowerCase() !== lastAddrRef.current.toLowerCase()) {
      run(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const run = async (addr: string) => {
    const clean = (addr || "").trim();
    setError(null);

    if (!clean) {
      setError("please enter your wallet");
      return;
    }
    if (clean.toLowerCase() === lastAddrRef.current.toLowerCase() && data) {
      return; // نفس العنوان ونفس البيانات موجودة
    }
    lastAddrRef.current = clean;

    // ألغِ الطلب السابق (إن وُجد)
    if (ctrlRef.current) ctrlRef.current.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    // حدّث الـ URL بدون إعادة تحميل الصفحة
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("address", clean);
      window.history.replaceState(null, "", u.pathname + "?" + u.searchParams.toString());
    } catch {}

    // مهلة (15s)
    const timeout = setTimeout(() => ctrl.abort(), 15000);

    try {
      setLoading(true);

      const apiUrl = new URL("/api/summary", window.location.origin);
      apiUrl.searchParams.set("address", clean);

      const r = await fetch(apiUrl.toString(), {
        cache: "no-store",
        signal: ctrl.signal,
      });

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

  // صفوف التقرير الرئيسي
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

  // حساب الصحة الشاملة
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

  return (
    <main className={`${brand.bg} ${brand.text} min-h-screen p-6`}>
      <div className="max-w-6xl mx-auto">
        <Header />
        <WalletBar onCheck={run} loading={loading} />

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-rose-500/40 bg-rose-500/10">
            {String(error)}
          </div>
        )}

        <div className="mb-6">
          <MainReportTable rows={rows} />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
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
          <DoctorSummary
            score={health.score}
            level={health.level}
            strongest={health.strongest}
            weakest={health.weakest}
          />
        </div>

        {/* لو حبيت تفعل الرادار لاحقًا:
        <ProgressRadar areas={radarAreas} />
        */}

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
      </div>
    </main>
  );
}

const round6 = (n: number) => String(Math.round((n || 0) * 1e6) / 1e6);
const fmt2 = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
