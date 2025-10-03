// app/lib/score.ts
export type SummaryLike = {
  walletAgeDays: number;
  nativeTxs: number;
  tokenTxs: number;
  uniqueDays: number;
  contracts: { uniqueInteractions: number };
  erc20Count?: number;
  nftCount?: number;
  totalVolumeEth?: number;
  // بروتوكولات (بدون Referrals أو Gas)
  uniswap?: number;
  aerodrome?: number;
  aave?: number;
  stargate?: number;
  metamask?: number;
  matcha?: number;
  lendingAny?: boolean;
};

// helper لتقييد القيم
const clamp = (x: number, min = 0, max = 100) => Math.max(min, Math.min(max, x));

// scale بسيط: x من 0..t يتحول لـ 0..100
const s = (x: number, t: number) => clamp((x / t) * 100);

// #### أبعاد الرادار (بدون Referrals وبدون Gas) ####
//
// History: walletAgeDays
// Activity: إجمالي txs
// Consistency: active days
// Diversity: uniqueContracts + erc20 + nft
// Volume: totalVolumeEth
// Protocols: استخدام بروتوكولات مهمة
//
export function computeDimensions(summary: SummaryLike) {
  const txCount = (summary.nativeTxs || 0) + (summary.tokenTxs || 0);

  // 1) History
  // 10=New, 50=Returning, 150=Long-timer, 300=Veteran, 600=Seasoned, 1000=OG
  const history = clamp(
    Math.max(
      s(summary.walletAgeDays, 10),   // أول سقف
      s(summary.walletAgeDays, 50),
      s(summary.walletAgeDays, 150),
      s(summary.walletAgeDays, 300),
      s(summary.walletAgeDays, 600),
      s(summary.walletAgeDays, 1000),
    )
  );

  // 2) Activity
  // 50/100/200/500/1000/5000
  const activity = clamp(
    Math.max(
      s(txCount, 50), s(txCount, 100), s(txCount, 200),
      s(txCount, 500), s(txCount, 1000), s(txCount, 5000),
    )
  );

  // 3) Consistency (active days)
  const consistency = clamp(
    Math.max(
      s(summary.uniqueDays || 0, 10),
      s(summary.uniqueDays || 0, 20),
      s(summary.uniqueDays || 0, 30),
      s(summary.uniqueDays || 0, 50),
      s(summary.uniqueDays || 0, 100),
      s(summary.uniqueDays || 0, 200),
    )
  );

  // 4) Diversity (unique contracts + erc20 + nft)
  const uContracts = summary.contracts?.uniqueInteractions || 0;
  const erc20 = summary.erc20Count || 0;
  const nft = summary.nftCount || 0;
  const diversityContracts = Math.max(s(uContracts, 10), s(uContracts, 20), s(uContracts, 50), s(uContracts, 100), s(uContracts, 500), s(uContracts, 1000));
  const diversityErc20     = Math.max(s(erc20, 5), s(erc20, 10), s(erc20, 20), s(erc20, 50), s(erc20, 100), s(erc20, 200));
  const diversityNft       = Math.max(s(nft, 5), s(nft, 10), s(nft, 20), s(nft, 50), s(nft, 100), s(nft, 500));
  const diversity = clamp((diversityContracts * 0.5) + (diversityErc20 * 0.3) + (diversityNft * 0.2));

  // 5) Volume (ETH)
  const volEth = summary.totalVolumeEth || 0;
  const volume = clamp(Math.max(s(volEth, 0.1), s(volEth, 0.5), s(volEth, 1), s(volEth, 5), s(volEth, 10), s(volEth, 25)));

  // 6) Protocols (بدون Referrals)
  const protCount =
    (summary.uniswap || 0) +
    (summary.aerodrome || 0) +
    (summary.aave || 0) +
    (summary.stargate || 0) +
    (summary.metamask || 0) +
    (summary.matcha || 0);

  const protocols = clamp(
    Math.max(
      s(protCount, 3),
      s(protCount, 6),
      s(protCount, 12),
      s(protCount, 20)
    ) + (summary.lendingAny ? 10 : 0) // bonus بسيط لو استخدم lending
  );

  // نرجع مصفوفة للرادار
  return [
    { key: "History",     value: Math.round(history) },
    { key: "Activity",    value: Math.round(activity) },
    { key: "Consistency", value: Math.round(consistency) },
    { key: "Diversity",   value: Math.round(diversity) },
    { key: "Volume",      value: Math.round(volume) },
    { key: "Protocols",   value: Math.round(protocols) },
  ];
}

// #### السكور النهائي (0..100) ####
// بدون Referrals + بدون Gas
export function computeWalletScore(summary: SummaryLike) {
  const dims = computeDimensions(summary);
  // متوسط بسيط (تقدر تغيّر للأوزان لو حبيت)
  const avg = dims.reduce((s, d) => s + d.value, 0) / dims.length;
  const score = Math.round(avg);

  let level: "Critical" | "Weak" | "Fair" | "Healthy" | "Elite";
  if (score < 40) level = "Critical";
  else if (score < 60) level = "Weak";
  else if (score < 75) level = "Fair";
  else if (score < 90) level = "Healthy";
  else level = "Elite";

  // أقوى وأضعف بُعد للمُلخص
  const strongest = [...dims].sort((a, b) => b.value - a.value)[0]?.key || "Activity";
  const weakest   = [...dims].sort((a, b) => a.value - b.value)[0]?.key || "Consistency";

  return { score, level, dims, strongest, weakest };
}
