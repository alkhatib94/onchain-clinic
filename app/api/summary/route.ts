/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { isAddress } from "viem";
import { getBasenameFor } from "@/app/lib/basename";
import { NATIVE_BRIDGE_SENDERS_L2, THIRD_PARTY_BRIDGES } from "@/config/bridges";
import { PROTOCOL_ADDRS, PROTOCOL_KEYWORDS } from "@/config/protocols";
import {
  nowSec, toStr, lc, sIncludes, ensureArray, isHttpUrl,
  fetchWithTimeout, withRetry, etherscanV2, prices,
  isoDay, isoWeek, isoMonth
} from "@/app/api/summary/_shared/utils";

/* ========= Types ========= */
type SummaryBody = {
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
  allTxTimestampsUTC: string[];
  mainnetLaunchUTC: string;
  holidayDatesUTC: string[];
  swaps: number;
  stablecoinTxs: number;
  usdcTrades: number;
  stablecoinTypes: number;
  maxSwapUsd: number;
  erc20Count: number;
  nftCount: number;
  totalVolumeEth: number;
  gasEth: number;
  usedThirdPartyBridge: boolean;
  usedNativeBridge: boolean;
  relayCount: number;
  jumperCount: number;
  bungeeCount: number;
  acrossCount: number;
  deployedContracts: number; // مؤقت: مباشر فقط (سيتم ترقيته من /details)
  // special clinics
  uniswap: number; sushi: number; pancake: number; aerodrome: number; aave: number;
  limitless: number; stargate: number; metamask: number; lendingAny: boolean; matcha: number;
  partial?: boolean;          // <— لإعلام الواجهة
};

/* ========= constants ========= */
const CHAIN_ID_BASE = 8453;
const BASE_MAINNET_LAUNCH = "2023-08-09T00:00:00Z";
const HOLIDAYS_MM_DD = new Set(["03-30", "01-01", "12-25"]);
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase();

/* === Etherscan V2 wrapper === */
// مفعّل عبر util: etherscanV2(params) ويحقن chainid & apikey من env

/* === Lightweight fetch of txs (مقلّص) === */
async function fetchNormalErc(address: string) {
  // معاملات عادية: صفحة واحدة كبيرة تكفي للعرض الأولي
  const normalRes = await etherscanV2({
    module: "account", action: "txlist", address,
    startblock: "0", endblock: "99999999",
    page: "1", offset: "2000", sort: "asc", chainid: String(CHAIN_ID_BASE),
  });

  // ERC20/ERC721: صفحة واحدة
  const [erc20Res, erc721Res] = await Promise.all([
    etherscanV2({ module: "account", action: "tokentx", address,
      startblock: "0", endblock: "99999999", page: "1", offset: "5000", sort: "asc" }),
    etherscanV2({ module: "account", action: "tokennfttx", address,
      startblock: "0", endblock: "99999999", page: "1", offset: "5000", sort: "asc" }),
  ]);

  const normal = ensureArray<any>(normalRes?.result);
  const erc20  = ensureArray<any>(erc20Res?.result);
  const erc721 = ensureArray<any>(erc721Res?.result);
  const ok = normal.filter((t) => String(t.isError) === "0");
  return { ok, erc20, erc721 };
}

/* ========= Route ========= */
export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const sp = req.nextUrl.searchParams;

  try {
    if (sp.get("debug") === "ping") {
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" }});
    }

    const raw = (sp.get("address") || "").trim();
    // دعم basenames/ENS البسيط (lookup خارجي خفيف)
    let address: `0x${string}` | null = null;
    if (raw.startsWith("0x") && isAddress(raw as `0x${string}`)) address = raw.toLowerCase() as `0x${string}`;
    else if (raw.includes(".")) {
      try {
        const r = await fetchWithTimeout(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(raw)}`, {}, 6000);
        const j = r.ok ? await r.json().catch(() => null) : null;
        const addr = j?.address || j?.addr;
        if (addr && isAddress(addr as `0x${string}`)) address = (addr as string).toLowerCase() as `0x${string}`;
      } catch {/* ignore */}
    }
    if (!address) return new Response(JSON.stringify({ error: "Invalid address or name" }), { status: 400 });

    const baseEns =
      raw.includes(".") && raw.toLowerCase().endsWith(".base.eth") ? raw.toLowerCase() : await getBasenameFor(address);

    // جلب خفيف
    const { ok, erc20, erc721 } = await fetchNormalErc(address);

    /* ---- إحصاءات أساسية ---- */
    const now = nowSec();
    const firstTxAt = ok[0] ? Number(ok[0].timeStamp) : null;
    const walletAgeDays = firstTxAt ? Math.floor((now - firstTxAt) / 86400) : 0;

    const days = new Set<string>(), weeks = new Set<string>(), months = new Set<string>();
    for (const t of ok) {
      const ts = Number(t.timeStamp);
      days.add(isoDay(ts)); weeks.add(isoWeek(ts)); months.add(isoMonth(ts));
    }
    const uniqueDays = days.size, uniqueWeeks = weeks.size, uniqueMonths = months.size;
    const nativeTxs = ok.length;
    const tokenTxs = erc20.length + erc721.length;

    // تقدير سريع لتفاعلات العقود (بدون getCode الثقيلة)
    const tos = new Set<string>(); for (const t of ok) if (t.to) tos.add(lc(t.to));
    const totalContractInteractions = [...tos].length > 0
      ? ok.filter((t) => !!t.to).length
      : 0;
    const uniqueContractInteractions = tos.size; // سيُستبدل لاحقًا في /details بدقّة

    /* ===== Bridges ===== */
    let depositedEth = 0; let nativeBridgeUsed = false; let usedThirdPartyBridge = false;
    const thirdPartyKeys = Object.keys(THIRD_PARTY_BRIDGES ?? {});
    const thirdPartySets: Record<string, Set<string>> = {};
    const bridgeCounts: Record<string, number> = {};
    for (const k of thirdPartyKeys) {
      bridgeCounts[k] = 0;
      thirdPartySets[k] = new Set((THIRD_PARTY_BRIDGES as any)[k]?.contracts?.map((x:string)=>x.toLowerCase()) ?? []);
    }

    const NATIVE_L2_OUT = new Set([
      "0x4200000000000000000000000000000000000010",
      "0x4200000000000000000000000000000000000011",
    ].map((x) => x.toLowerCase()));

    for (const t of ok) {
      const from = lc(t.from), to = lc(t.to);
      const valEth = Number(t.value || 0) / 1e18;

      if (to === address) {
        if ((NATIVE_BRIDGE_SENDERS_L2 ?? []).map(lc).includes(from)) {
          nativeBridgeUsed = true; depositedEth += valEth;
        }
      }
      if (from === address && NATIVE_L2_OUT.has(to)) nativeBridgeUsed = true;

      for (const k of thirdPartyKeys) {
        const set = thirdPartySets[k]; if (set.has(from) || set.has(to)) { usedThirdPartyBridge = true; bridgeCounts[k]++; }
      }
    }

    for (const tr of erc20) {
      const from = lc(tr.from), to = lc(tr.to), ca = lc(tr.contractAddress);
      if ((from === address && NATIVE_L2_OUT.has(to)) || (to === address && NATIVE_L2_OUT.has(from)))
        nativeBridgeUsed = true;
      for (const k of thirdPartyKeys) {
        const set = thirdPartySets[k]; if (set.has(from) || set.has(to) || set.has(ca)) { usedThirdPartyBridge = true; bridgeCounts[k]++; }
      }
    }

    /* ---- الأسعار والحجوم ---- */
    const px = await prices();
    const volumeEth = ok.reduce((s, t) => s + Number(t.value) / 1e18, 0);
    const volumeEthUSD = volumeEth * (px.eth || 0);

    let usdcAmount = 0;
    for (const tr of erc20)
      if (lc(tr.contractAddress) === USDC) {
        const dec = Number(tr.tokenDecimal || 6);
        usdcAmount += Number(tr.value) / 10 ** dec;
      }
    const volumeUsdTotal = volumeEthUSD + usdcAmount * (px.usdc || 1);

    const balRes = await etherscanV2({ module: "account", action: "balance", address, tag: "latest" });
    let wei = "0";
    if (typeof (balRes as any)?.result === "string") wei = (balRes as any).result;
    else if ((balRes as any)?.result?.balance) wei = (balRes as any).result.balance;
    const balanceEth = Number(wei) / 1e18;

    /* ---- swaps detection (خفيف) ---- */
    const DEX_KEYS = ["uniswap", "pancake", "sushi", "aerodrome", "matcha"] as const;
    const DEX_ROUTER_SET = new Set<string>();
    for (const k of DEX_KEYS)
      (Array.isArray((PROTOCOL_ADDRS as any)[k]) ? (PROTOCOL_ADDRS as any)[k] : []).forEach((a: string) =>
        DEX_ROUTER_SET.add(lc(a))
      );
    const SWAP_WORDS = [
      "swap","exactinput","exactoutput","universalrouter","v3swap",
      ...(((PROTOCOL_KEYWORDS as any).uniswap ?? [])),
      ...(((PROTOCOL_KEYWORDS as any).pancake ?? [])),
      ...(((PROTOCOL_KEYWORDS as any).sushi ?? [])),
      ...(((PROTOCOL_KEYWORDS as any).aerodrome ?? [])),
      ...(((PROTOCOL_KEYWORDS as any).matcha ?? [])),
    ].map(lc);

    const byHash: Record<string, { hasIn: boolean; hasOut: boolean; stableUsd: number; anyUsd: number }> = {};
    const STABLE_SYMBOLS = new Set(["USDC","USDBC","USDT","DAI","FRAX","USDE","LUSD"]);
    for (const tr of erc20) {
      const h = toStr(tr.hash || tr.transactionHash); if (!h) continue;
      const from = lc(tr.from), to = lc(tr.to), dec = Number(tr.tokenDecimal || 6);
      const sym = toStr(tr.tokenSymbol).toUpperCase(); const val = Number(tr.value || 0);
      if (!byHash[h]) byHash[h] = { hasIn: false, hasOut: false, stableUsd: 0, anyUsd: 0 };
      if (to === address) byHash[h].hasIn = true;
      if (from === address) byHash[h].hasOut = true;
      const stableUsd = STABLE_SYMBOLS.has(sym) ? val / 10 ** dec : 0;
      const anyUsd = val / 10 ** dec;
      if (stableUsd > byHash[h].stableUsd) byHash[h].stableUsd = stableUsd;
      if (anyUsd > byHash[h].anyUsd) byHash[h].anyUsd = anyUsd;
    }

    const looksLikeSwap = (t: any) => {
      const fn = lc(t.functionName); const to = lc(t.to); const from = lc(t.from);
      return SWAP_WORDS.some((w) => sIncludes(fn, w)) || DEX_ROUTER_SET.has(to) || DEX_ROUTER_SET.has(from);
    };

    const swapHashes = new Set<string>(), okByHash: Record<string, any> = {};
    for (const t of ok) { const h = toStr(t.hash); if (h) okByHash[h] = t; if (looksLikeSwap(t) && h) swapHashes.add(h); }
    for (const [h, agg] of Object.entries(byHash)) if (agg.hasIn && agg.hasOut) swapHashes.add(h);
    const swaps = swapHashes.size;

    const stableTransfers = erc20.filter((tr) => STABLE_SYMBOLS.has(toStr(tr.tokenSymbol).toUpperCase()));
    const stablecoinTxs = stableTransfers.length;
    const usdcTrades = erc20.filter((tr) => toStr(tr.tokenSymbol).toUpperCase() === "USDC" && swapHashes.has(toStr(tr.hash || tr.transactionHash))).length;
    const stablecoinTypes = new Set(stableTransfers
      .filter((tr) => swapHashes.has(toStr(tr.hash || tr.transactionHash)))
      .map((tr) => toStr(tr.tokenSymbol).toUpperCase())
    ).size;

    let maxSwapUsd = 0;
    const ethPrice = px.eth || 0;
    for (const h of swapHashes) {
      const t = okByHash[h];
      const ethUsd = t ? (Number(t.value || 0) / 1e18) * ethPrice : 0;
      const e20 = byHash[h]; const stableUsd = (e20 && e20.stableUsd) || 0; const anyUsd = (e20 && e20.anyUsd) || 0;
      maxSwapUsd = Math.max(maxSwapUsd, ethUsd, stableUsd, anyUsd);
    }

    // تنوّع ورسوم (تقريبي بدون getCode)
    const erc20Count = new Set(erc20.map((t) => lc(t.contractAddress))).size;
    const nftCount  = new Set(erc721.map((t) => lc(t.contractAddress))).size;
    const totalVolumeEth = volumeEth;
    const gasEth = ok.reduce((s, t) => {
      const gu = Number(t.gasUsed ?? t.gas ?? 0), gp = Number(t.gasPrice ?? 0);
      return gu && gp ? s + (gu * gp) / 1e18 : s;
    }, 0);

    // نشرات مباشرة فقط (deployedContracts مؤقت)
    const directDeploys = ok
      .filter((t) => {
        const to = lc(t.to); const created = toStr(t.contractAddress);
        return (to === "" || to === "0x0000000000000000000000000000000000000000") && created && String(t.isError) === "0";
      })
      .map((t) => lc(t.contractAddress));
    const deployedContracts = new Set(directDeploys).size; // يُستكمل لاحقًا في /details

    // Special clinics (خفيف)
    const allTxsForProto = [
      ...ok.map((t) => ({ to: lc(t.to), from: lc(t.from), fn: lc(t.functionName) })),
      ...erc20.map((t) => ({ to: lc(t.to), from: lc(t.from), fn: "" })),
      ...erc721.map((t) => ({ to: lc(t.to), from: lc(t.from), fn: "" })),
    ];
    function countProto(name: string) {
      const addrs = new Set(((PROTOCOL_ADDRS as any)?.[name] ?? []).map(lc).filter(Boolean));
      const words: string[] = Array.isArray((PROTOCOL_KEYWORDS as any)?.[name]) ? (PROTOCOL_KEYWORDS as any)[name] : [];
      let c = 0;
      for (const t of allTxsForProto) {
        const to = toStr(t.to), from = toStr(t.from), fn = toStr(t.fn);
        if ((addrs.size > 0 && (addrs.has(to) || addrs.has(from))) || words.some((w) => sIncludes(fn, w))) c++;
      }
      return c;
    }
    const uniswap = countProto("uniswap"),
          sushi = countProto("sushi"),
          pancake = countProto("pancake"),
          aerodrome = countProto("aerodrome"),
          aave = countProto("aave"),
          limitless = countProto("limitless"),
          stargate = countProto("stargate"),
          metamask = countProto("metamask"),
          matcha = countProto("matcha");

    const lendingAny =
      aave > 0 || allTxsForProto.some((t) => {
        const f = toStr(t.fn); return sIncludes(f, "borrow") || sIncludes(f, "repay") || sIncludes(f, "liquidate");
      });

    const thresholds: SummaryBody["thresholds"] = {
      deposited_gt_10k: depositedEth * (px.eth || 0) >= 10000,
      deposited_gt_50k: depositedEth * (px.eth || 0) >= 50000,
      deposited_gt_250k: depositedEth * (px.eth || 0) >= 250000,
      volume_gt_10k: volumeUsdTotal >= 10000,
      volume_gt_50k: volumeUsdTotal >= 50000,
      volume_gt_100k: volumeUsdTotal >= 100000,
      months_ge_2: uniqueMonths >= 2,
      months_ge_6: uniqueMonths >= 6,
      months_ge_9: uniqueMonths >= 9,
      contracts_ge_4: totalContractInteractions >= 4,
      contracts_ge_10: totalContractInteractions >= 10,
      contracts_ge_25: totalContractInteractions >= 25,
      contracts_ge_100: totalContractInteractions >= 100,
    };

    const allTxTimestampsUTC = Array.from(
      new Set([
        ...ok.map((t) => new Date(Number(t.timeStamp) * 1000).toISOString()),
        ...erc20.map((t) => new Date(Number(t.timeStamp) * 1000).toISOString()),
        ...erc721.map((t) => new Date(Number(t.timeStamp) * 1000).toISOString()),
      ])
    ).sort();
    const holidayDatesUTC = Array.from(
      new Set(allTxTimestampsUTC.map((iso) => iso.slice(0, 10)).filter((ymd) => HOLIDAYS_MM_DD.has(ymd.slice(5))))
    );

    const body: SummaryBody = {
      address,
      baseEns,
      balanceEth,
      volume: { eth: volumeEth, ethUsd: volumeEthUSD, usdTotal: volumeUsdTotal, usdcAmount },
      nativeTxs,
      tokenTxs,
      walletAgeDays,
      uniqueDays,
      uniqueWeeks,
      uniqueMonths,
      contracts: { totalInteractions: totalContractInteractions, uniqueInteractions: uniqueContractInteractions },
      bridge: { depositedEth, depositedUsd: depositedEth * (px.eth || 0), nativeBridgeUsed },
      thresholds,
      allTxTimestampsUTC,
      mainnetLaunchUTC: BASE_MAINNET_LAUNCH,
      holidayDatesUTC,
      swaps,
      stablecoinTxs,
      usdcTrades,
      stablecoinTypes,
      maxSwapUsd,
      erc20Count,
      nftCount,
      totalVolumeEth,
      gasEth,
      usedNativeBridge: nativeBridgeUsed,
      usedThirdPartyBridge,
      relayCount: bridgeCounts["relay"] || 0,
      jumperCount: bridgeCounts["jumper"] || 0,
      bungeeCount: bridgeCounts["bungee"] || 0,
      acrossCount: bridgeCounts["across"] || 0,
      deployedContracts, // مؤقت — سيتم ترقيته
      uniswap, sushi, pancake, aerodrome, aave, limitless, stargate, metamask, matcha,
      lendingAny,
      partial: true,
    };

    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json", "cache-control": "no-store, max-age=0" },
    });
  } catch (e: any) {
    console.error("summary.core.error", e);
    return new Response(JSON.stringify({ error: e?.message || "internal error" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
}
