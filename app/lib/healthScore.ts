// app/lib/healthScore.ts
export type HealthInput = {
  // Activity
  walletAgeDays?: number;
  nativeTxs?: number;
  tokenTxs?: number;
  allTxTimestampsUTC?: string[];
  fallbackActiveDays?: number;   // 👈 جديد: نمرّره من summary.uniqueDays

  // Diversity
  contracts?: { totalInteractions: number; uniqueInteractions: number };
  erc20Count?: number;
  nftCount?: number;

  // Usage
  swaps?: number;
  stablecoinTxs?: number;
  usdcTrades?: number;
  stablecoinTypes?: number;
  maxSwapUsd?: number;

  // Volume (ETH)
  volumeEth?: number;

  // Deployment
  deployedContracts?: number;

  // Special clinic (bonus صغير)
  uniswap?: number;
  aerodrome?: number;
  aave?: number;
  stargate?: number;
  metamask?: number;
  matcha?: number;
  lendingAny?: boolean;
};

export type HealthAreaScores = {
  Activity: number;
  Diversity: number;
  Usage: number;
  Volume: number;
  Lifestyle: number;
  Deployment: number;
};

export type HealthResult = {
  score: number;  // 0–100
  level: "Critical"|"Weak"|"Fair"|"Healthy"|"Elite";
  emoji: string;
  areas: HealthAreaScores;
  strongest: keyof HealthAreaScores;
  weakest: keyof HealthAreaScores;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const cap     = (v: number, target: number) => clamp01(v / Math.max(target, 1e-9));
const smooth  = (v: number, target: number) => clamp01(v / (v + target * 0.5));

const ACTIVITY_TARGET = { days: 600, txs: 2000, activeDays: 150 };
const DIVERSITY_TARGET = { uniqContracts: 100, erc20: 50, nft: 50 };
const USAGE_TARGET = { swaps: 50, stableTxs: 10, stableTypes: 3, usdc: 3, bigSwapUsd: 10_000 };
const VOLUME_TARGET_ETH = 10;     // ~10 ETH to be “full”
const DEPLOY_TARGET = 20;         // 20 contracts deployed

export function computeHealth(i: HealthInput) {
  // — raw
  const walletAgeDays = i.walletAgeDays ?? 0;
  const nativeTxs     = i.nativeTxs ?? 0;
  const tokenTxs      = i.tokenTxs ?? 0;
  const totalTxs      = nativeTxs + tokenTxs;

  // == Active days (robust) ==
  const activeDaysFromTs = (() => {
    const set = new Set<string>();
    for (const iso of i.allTxTimestampsUTC ?? []) set.add(iso.slice(0,10));
    return set.size;
  })();
  const activeDays = Math.max(activeDaysFromTs, i.fallbackActiveDays ?? 0); // 👈 fallback

  // Diversity
  const uniqContracts = i.contracts?.uniqueInteractions ?? 0;
  const erc20Count    = i.erc20Count ?? 0;
  const nftCount      = i.nftCount ?? 0;

  // Usage
  const swaps         = i.swaps ?? 0;
  const stablecoinTxs = i.stablecoinTxs ?? 0;
  const usdcTrades    = i.usdcTrades ?? 0;
  const stableTypes   = i.stablecoinTypes ?? 0;
  const maxSwapUsd    = i.maxSwapUsd ?? 0;

  // Volume
  const volumeEth     = i.volumeEth ?? 0;

  // Deployment
  const deployed      = i.deployedContracts ?? 0;

  // ————————————————— Activity (25)
  // (tuning): ندي weight أعلى للتراكم الكبير للـ txs، مع سقف عمر معقول
  const ageS   = cap(walletAgeDays, ACTIVITY_TARGET.days);
  const txsS   = smooth(totalTxs,     ACTIVITY_TARGET.txs);
  const daysS  = cap(activeDays,      ACTIVITY_TARGET.activeDays);

  const activity01 = 0.30*ageS + 0.55*txsS + 0.15*daysS;
  const Activity   = Math.round(activity01*100);

  // ————————————————— Diversity (20)
  const uniqS  = cap(uniqContracts, DIVERSITY_TARGET.uniqContracts);
  const erc20S = cap(erc20Count,    DIVERSITY_TARGET.erc20);
  const nftS   = cap(nftCount,      DIVERSITY_TARGET.nft);

  const diversity01 = 0.5*uniqS + 0.3*erc20S + 0.2*nftS;
  const Diversity   = Math.round(diversity01*100);

  // ————————————————— Usage (20)
  const swapsS  = cap(swaps,         USAGE_TARGET.swaps);
  const stxS    = cap(stablecoinTxs, USAGE_TARGET.stableTxs);
  const stypesS = cap(stableTypes,   USAGE_TARGET.stableTypes);
  const usdcS   = cap(usdcTrades,    USAGE_TARGET.usdc);
  const bigS    = cap(maxSwapUsd,    USAGE_TARGET.bigSwapUsd);

  const norm3 = (n?:number)=> cap(n ?? 0, 3);
  const clinicBonus =
    (norm3(i.uniswap) + norm3(i.aerodrome) + norm3(i.aave) + norm3(i.stargate) +
     norm3(i.metamask) + norm3(i.matcha) + (i.lendingAny ? 1 : 0)) / 7;

  const usage01 = 0.50*swapsS + 0.18*stxS + 0.08*stypesS + 0.04*usdcS + 0.10*bigS + 0.10*clinicBonus;
  const Usage   = Math.round(usage01*100);

  // ————————————————— Volume (15) — ETH only
  const volume01 = smooth(volumeEth, VOLUME_TARGET_ETH);
  const Volume   = Math.round(volume01*100);

  // ————————————————— Lifestyle (10)
  const dates = (i.allTxTimestampsUTC ?? []).map(s => new Date(s));
  const anyMorning = dates.some(d => { const h=d.getUTCHours(); return h>=6 && h<9; });
  const anyNight   = dates.some(d => { const h=d.getUTCHours(); return h>=0 && h<6; });
  const byDay: Record<string,number> = {};
  for (const iso of i.allTxTimestampsUTC ?? []) byDay[iso.slice(0,10)] = (byDay[iso.slice(0,10)]||0)+1;
  const day10 = Object.values(byDay).some(c => c>=10);
  const sorted = [...dates].sort((a,b)=>+a-+b);
  const firstWeek = (()=> {
    if(!sorted.length) return false;
    const t0 = +sorted[0], w = t0 + 7*86400_000;
    return sorted.some(d => +d>=t0 && +d<w);
  })();
  const lifestyleHits = [anyMorning, anyNight, day10, firstWeek].filter(Boolean).length;
  const lifestyle01 = clamp01(lifestyleHits/4);
  const Lifestyle = Math.round(lifestyle01*100);

  // ————————————————— Deployment (10)
  const Deployment = Math.round(cap(deployed, DEPLOY_TARGET)*100);

  // ————————————————— Weighted sum (لا يشمل Referrals/TreatmentCosts)
  const W = { Activity:25, Diversity:20, Usage:20, Volume:15, Lifestyle:10, Deployment:10 };
  const areas: HealthAreaScores = { Activity, Diversity, Usage, Volume, Lifestyle, Deployment };
  const score =
    Math.round(
      (areas.Activity*W.Activity + areas.Diversity*W.Diversity + areas.Usage*W.Usage +
       areas.Volume*W.Volume + areas.Lifestyle*W.Lifestyle + areas.Deployment*W.Deployment) / 100
    );

  let level: HealthResult["level"];
  if      (score < 40) level = "Critical";
  else if (score < 60) level = "Weak";
  else if (score < 75) level = "Fair";
  else if (score < 90) level = "Healthy";
  else                 level = "Elite";

  const emoji =
    level==="Elite" ? "🟣" :
    level==="Healthy" ? "🟢" :
    level==="Fair" ? "🟡" :
    level==="Weak" ? "🟠" : "🔴";

  const entries = Object.entries(areas) as [keyof HealthAreaScores,number][];
  entries.sort((a,b)=>b[1]-a[1]);
  const strongest = entries[0][0];
  const weakest   = entries[entries.length-1][0];

  return { score, level, emoji, areas, strongest, weakest };
}
