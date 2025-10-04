// app/page.tsx
"use client";

import { useState } from "react";
import { brand } from "@/config/brand";
import Header from "./components/Header";
import WalletBar from "./components/WalletBar";
import MainReportTable from "./components/MainReportTable";
import BadgesGrid from "./badges/BadgesGrid";

// نظام الصحة الشامل + كروت التشخيص/الملخص + الرادار
import { computeHealth } from "@/app/lib/healthScore";
import FinalDiagnosisCard from "@/components/FinalDiagnosisCard";
import DoctorSummary from "@/components/DoctorSummary";
// مُعطّل مؤقتًا في الواجهة
import ProgressRadar from "@/components/ProgressRadar";

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

  // اختيارية من API
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

  // special clinics (قد تأتي من الـ API)
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

  const run = async (addr: string) => {
  setError(null);
  setData(null);
  if (!addr) { setError("please enter your wallet"); return; }

  try {
    setLoading(true);

    // base URL موثوق
    const base =
      (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
      (typeof window !== "undefined" ? window.location.origin : "");

    const url = `${base}/api/summary?address=${encodeURIComponent(addr.trim())}`;

    const r = await fetch(url, { cache: "no-store" });

    const rawText = await r.clone().text();
    console.log("GET", url, "→", r.status, r.statusText);
    console.log("BODY:", rawText);

    let j: any = null;
    try { j = JSON.parse(rawText); } catch {}

    if (!r.ok || !isSummary(j)) {
      const serverMsg = (j && j.error) ? j.error : rawText || r.statusText || "Unexpected API response";
      setError(serverMsg);
      return;
    }
    setData(j);
  } catch (e: any) {
    setError(e?.message || "Network error");
  } finally {
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

    // لحالات نقص الـ timestamps: بنستخدم uniqueDays كبديل
    allTxTimestampsUTC: s?.allTxTimestampsUTC ?? [],
    fallbackActiveDays: s?.uniqueDays ?? 0,
  });

  // توحيد شكل البيانات للرادار ليطابق ما يتوقعه ProgressRadar
  type RadarAreas = {
    history: number;
    activity: number;
    variety: number;   // diversity → variety
    usage: number;
    costs: number;
    deployment: number;
    clinics: number;     // إضافي
    lifestyle: number;   // إضافي
  };

  const radarAreas: RadarAreas = {
    history:     (health as any)?.areas?.history ?? 0,
    activity:    (health as any)?.areas?.activity ?? 0,
    variety:
      (health as any)?.areas?.variety ??
      (health as any)?.areas?.diversity ??
      0,
    usage:       (health as any)?.areas?.usage ?? 0,
    costs:       (health as any)?.areas?.costs ?? 0,
    deployment:  (health as any)?.areas?.deployment ?? 0,
    clinics:     (health as any)?.areas?.clinics ?? 0,
    lifestyle:   (health as any)?.areas?.lifestyle ?? 0,
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

        {/* كرت Main Report */}
        <div className="mb-6">
          <MainReportTable rows={rows} />
        </div>

        {/* تشخيص نهائي + ملخص الطبيب */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <FinalDiagnosisCard
            score={health.score}
            level={health.level}
            emoji={health.emoji}
            strongest={health.strongest}
            weakest={health.weakest}
            onMint={async () => {
              // TODO: اربط عقد الـ Mint هنا لاحقاً
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

        {/* رادار التقدّم (معطل مؤقتًا) */}
        {/* <div className="mb-8">
          <ProgressRadar areas={radarAreas} />
        </div> */}

        {/* شبكة البادجات */}
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
