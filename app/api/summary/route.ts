// app/api/summary/route.ts
import { NextRequest } from "next/server";

// إعدادات تشغيل الفنكشن
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

import { createPublicClient, http, isAddress } from "viem";
import { base } from "viem/chains";
import { NATIVE_BRIDGE_SENDERS_L2, THIRD_PARTY_BRIDGES } from "@/config/bridges";
import { getBasenameFor } from "@/app/lib/basename";
import { PROTOCOL_ADDRS, PROTOCOL_KEYWORDS } from "@/config/protocols";

// ====== مفاتيح/بيئات ======
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const ALCHEMY_BASE_RPC = process.env.ALCHEMY_BASE_RPC || "";
const COINGECKO_RAW = process.env.COINGECKO_API;

// ====== ثوابت عامة ======
const BASE_MAINNET_LAUNCH = "2023-08-09T00:00:00Z";
const HOLIDAYS_MM_DD = new Set<string>(["03-30", "01-01", "12-25"]);

// ====== Viem client (مع fallback) ======
const RPC_FALLBACK =
  ((base as any).rpcUrls?.public?.http?.[0] as string) ??
  ((base as any).rpcUrls?.default?.http?.[0] as string) ??
  "https://mainnet.base.org";

const client = createPublicClient({
  chain: base,
  transport: http(ALCHEMY_BASE_RPC || RPC_FALLBACK),
});


// ====== أدوات مساعدة عامة ======
function isHttpUrl(raw?: string) {
  try {
    if (!raw) return false;
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// fetch مع مهلة افتراضية 9 ثواني
async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 9000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    return r;
  } finally {
    clearTimeout(id);
  }
}

// ====== BaseScan ======
const BASESCAN_API = "https://api.basescan.org/api";
function bsUrl(p: Record<string, string>) {
  const u = new URL(BASESCAN_API);
  for (const k in p) u.searchParams.set(k, p[k]);
  if (BASESCAN_API_KEY) u.searchParams.set("apikey", BASESCAN_API_KEY);
  return u.toString();
}
async function basescan(p: Record<string, string>) {
  const r = await fetchWithTimeout(bsUrl(p));
  const j = await r.json().catch(() => null);
  return j?.result || [];
}

// ====== CoinGecko ======
const DEFAULT_CG_URL = "https://api.coingecko.com/api/v3/simple/price";
async function prices() {
  const baseUrl = isHttpUrl(COINGECKO_RAW as string) ? (COINGECKO_RAW as string) : DEFAULT_CG_URL;
  const key = isHttpUrl(COINGECKO_RAW as string) ? (process.env.COINGECKO_API_KEY || "") : (COINGECKO_RAW || "");
  const u = new URL(baseUrl);
  if (!u.pathname.endsWith("/simple/price")) u.pathname = "/api/v3/simple/price";
  u.searchParams.set("ids", "ethereum,usd-coin");
  u.searchParams.set("vs_currencies", "usd");

  const headers: Record<string, string> = {};
  if (key) {
    headers["x-cg-demo-api-key"] = key;
    headers["x-cg-pro-api-key"] = key;
  }

  try {
    const r = await fetchWithTimeout(u.toString(), { headers });
    if (!r.ok) return { eth: 0, usdc: 1 };
    const j = await r.json().catch(() => null);
    if (!j) return { eth: 0, usdc: 1 };
    return { eth: j?.ethereum?.usd ?? 0, usdc: j?.["usd-coin"]?.usd ?? 1 };
  } catch {
    return { eth: 0, usdc: 1 };
  }
}

// ====== تحويل الاسم/العنوان إلى 0x ======
async function resolveAddressOrName(input: string): Promise<`0x${string}` | null> {
  if (!input) return null;
  const s = input.trim();
  if (s.startsWith("0x") && isAddress(s as `0x${string}`)) return s.toLowerCase() as `0x${string}`;
  if (s.includes(".")) {
    try {
      const r = await fetchWithTimeout(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(s)}`);
      if (!r.ok) return null;
      const j = await r.json().catch(() => null);
      const addr = (j?.address || j?.addr) as string | undefined;
      if (addr && isAddress(addr as `0x${string}`)) return addr.toLowerCase() as `0x${string}`;
    } catch {}
  }
  return null;
}

// ====== Utilities ======
const isoDay = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
function isoWeek(ts: number) {
  const d = new Date(Date.UTC(new Date(ts * 1000).getUTCFullYear(), new Date(ts * 1000).getUTCMonth(), new Date(ts * 1000).getUTCDate()));
  const dn = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dn);
  const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wn = Math.ceil(((+d - +ys) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(wn).padStart(2, "0")}`;
}
const isoMonth = (t: number) => new Date(t * 1000).toISOString().slice(0, 7);
async function isContract(addr: string) {
  const code = await client.getCode({ address: addr as `0x${string}` }).catch(() => "0x");
  return code && code !== "0x";
}

// ====== Route ======
export async function GET(req: NextRequest) {
  try {
    // Debug ping للتشخيص السريع
    if (req.nextUrl.searchParams.get("debug") === "ping") {
      return new Response(JSON.stringify({ ok: true, note: "alive" }), {
        headers: { "content-type": "application/json" },
      });
    }

    const raw = (req.nextUrl.searchParams.get("address") || "").trim();
    const address = await resolveAddressOrName(raw);
    if (!address) {
      return new Response(JSON.stringify({ error: "Invalid address or name" }), { status: 400 });
    }

    // Basename
    let baseEns: string | null = null;
    if (raw.includes(".") && raw.toLowerCase().endsWith(".base.eth")) {
      baseEns = raw.toLowerCase();
    } else {
      baseEns = await getBasenameFor(address);
    }

    // --- جلب المعاملات (BaseScan) ---
    const [normal, erc20, erc721] = await Promise.all([
      basescan({
        module: "account",
        action: "txlist",
        address,
        startblock: "0",
        endblock: "99999999",
        page: "1",
        offset: "5000",
        sort: "asc",
      }),
      basescan({
        module: "account",
        action: "tokentx",
        address,
        startblock: "0",
        endblock: "99999999",
        page: "1",
        offset: "5000",
        sort: "asc",
      }),
      basescan({
        module: "account",
        action: "tokennfttx",
        address,
        startblock: "0",
        endblock: "99999999",
        page: "1",
        offset: "5000",
        sort: "asc",
      }),
    ]);

    const ok = (normal || []).filter((t: any) => t.isError === "0");
    const now = Math.floor(Date.now() / 1000);
    const firstTxAt = ok[0] ? Number(ok[0].timeStamp) : null;
    const walletAgeDays = firstTxAt ? Math.floor((now - firstTxAt) / 86400) : 0;

    // unique day/week/month
    const days = new Set<string>(), weeks = new Set<string>(), months = new Set<string>();
    for (const t of ok) {
      const ts = Number(t.timeStamp);
      days.add(isoDay(ts));
      weeks.add(isoWeek(ts));
      months.add(isoMonth(ts));
    }
    const uniqueDays = days.size,
      uniqueWeeks = weeks.size,
      uniqueMonths = months.size;

    const nativeTxs = ok.length;
    const tokenTxs = (erc20?.length || 0) + (erc721?.length || 0);

    // العقود المتفاعَل معها
    const toSet = new Set<string>();
    for (const t of ok) if (t.to) toSet.add(String(t.to).toLowerCase());
    const toArr = [...toSet];
    const flags = await Promise.all(toArr.map((a) => isContract(a)));
    const cset = new Set<string>();
    for (let i = 0; i < toArr.length; i++) if (flags[i]) cset.add(toArr[i]);
    const uniqueContractInteractions = cset.size;
    const totalContractInteractions = ok.filter((t: any) => t.to && cset.has(String(t.to).toLowerCase())).length;

    // Bridge deposits + عدّادات الطرف الثالث
    let depositedEth = 0;
    let nativeBridgeUsed = false;
    let usedThirdPartyBridge = false;

    const thirdPartySets: Record<string, Set<string>> = {};
    for (const k of Object.keys(THIRD_PARTY_BRIDGES)) {
      thirdPartySets[k] = new Set((THIRD_PARTY_BRIDGES as any)[k].contracts || []);
    }
    const bridgeCounts: Record<string, number> = {};
    for (const k of Object.keys(thirdPartySets)) bridgeCounts[k] = 0;

    for (const t of ok) {
      const from = String(t.from || "").toLowerCase();
      const to = String(t.to || "").toLowerCase();
      const val = Number(t.value) / 1e18;

      if (to === address) {
        if (NATIVE_BRIDGE_SENDERS_L2.includes(from)) {
          depositedEth += val;
          nativeBridgeUsed = true;
        }
        for (const b of Object.keys(thirdPartySets)) {
          if (thirdPartySets[b].has(from)) {
            depositedEth += val;
            usedThirdPartyBridge = true;
            bridgeCounts[b] += 1;
          }
        }
      }
    }

    // أسعار
    const px = await prices();

    // حجم ETH التقريبي
    const volumeEth = ok.reduce((s: number, t: any) => s + Number(t.value) / 1e18, 0);
    const volumeEthUSD = volumeEth * (px.eth || 0);

    // USDC عبر token txs
    const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    let usdcAmount = 0;
    for (const tr of erc20 || []) {
      if (String(tr.contractAddress || "").toLowerCase() === USDC) {
        const dec = Number(tr.tokenDecimal || 6);
        usdcAmount += Number(tr.value) / 10 ** dec;
      }
    }
    const volumeUsdTotal = volumeEthUSD + usdcAmount * (px.usdc || 1);

    // الرصيد
    const balRes = await basescan({ module: "account", action: "balance", address, tag: "latest" });
    const wei = Array.isArray(balRes) ? balRes?.[0]?.balance || "0" : (balRes as any)?.balance || "0";
    const balanceEth = Number(wei) / 1e18;

    // ========= Prescription Usage =========
    const DEX_KEYS: (keyof typeof PROTOCOL_ADDRS)[] = ["uniswap", "pancake", "sushi", "aerodrome", "matcha"];
    const DEX_ROUTER_SET = new Set<string>();
    for (const k of DEX_KEYS) for (const a of PROTOCOL_ADDRS[k]) DEX_ROUTER_SET.add(a.toLowerCase());
    const SWAP_WORDS = Array.from(
      new Set<string>(
        [
          "swap",
          "exactinput",
          "exactoutput",
          "universalrouter",
          "v3swap",
          ...PROTOCOL_KEYWORDS.uniswap,
          ...PROTOCOL_KEYWORDS.pancake,
          ...PROTOCOL_KEYWORDS.sushi,
          ...PROTOCOL_KEYWORDS.aerodrome,
          ...PROTOCOL_KEYWORDS.matcha,
        ].map((s) => s.toLowerCase())
      )
    );

    type E20Agg = { hasIn: boolean; hasOut: boolean; stableUsd: number; anyUsd: number };
    const byHash: Record<string, E20Agg> = {};
    const STABLE_SYMBOLS = new Set(["USDC", "USDBC", "USDT", "DAI", "FRAX", "USDE", "LUSD"]);

    for (const tr of erc20 || []) {
      const h = String(tr.hash || tr.transactionHash || "");
      if (!h) continue;
      const from = String(tr.from || "").toLowerCase();
      const to = String(tr.to || "").toLowerCase();
      const dec = Number(tr.tokenDecimal || 6);
      const sym = String(tr.tokenSymbol || "").toUpperCase();
      const val = Number(tr.value || 0);

      if (!byHash[h]) byHash[h] = { hasIn: false, hasOut: false, stableUsd: 0, anyUsd: 0 };
      if (to === address) byHash[h].hasIn = true;
      if (from === address) byHash[h].hasOut = true;

      const stableUsd = STABLE_SYMBOLS.has(sym) ? val / 10 ** dec : 0;
      const anyUsd = val / 10 ** dec;
      if (stableUsd > byHash[h].stableUsd) byHash[h].stableUsd = stableUsd;
      if (anyUsd > byHash[h].anyUsd) byHash[h].anyUsd = anyUsd;
    }

    const swapHashes = new Set<string>();
    const looksLikeSwap = (t: any) => {
      const fn = String(t.functionName || "").toLowerCase();
      const to = String(t.to || "").toLowerCase();
      const from = String(t.from || "").toLowerCase();
      const hitByFn = SWAP_WORDS.some((w) => fn.includes(w));
      const hitByAddr = DEX_ROUTER_SET.has(to) || DEX_ROUTER_SET.has(from);
      return hitByFn || hitByAddr;
    };

    const okByHash: Record<string, any> = {};
    for (const t of ok || []) {
      const h = String(t.hash || "");
      if (h) okByHash[h] = t;
      if (looksLikeSwap(t) && h) swapHashes.add(h);
    }
    for (const [h, agg] of Object.entries(byHash)) {
      if (agg.hasIn && agg.hasOut) swapHashes.add(h);
    }
    const swaps = swapHashes.size;

    // معاملات الستيبلكوينز / USDC / عدد الأنواع
    const stableTransfers = (erc20 || []).filter((tr: any) => STABLE_SYMBOLS.has(String(tr.tokenSymbol || "").toUpperCase()));
    const stablecoinTxs = stableTransfers.length;
    const usdcTrades = (erc20 || []).filter((tr: any) => String(tr.tokenSymbol || "").toUpperCase() === "USDC").length;
    const stablecoinTypes = new Set(stableTransfers.map((tr: any) => String(tr.tokenSymbol || "").toUpperCase())).size;

    // أكبر صفقة USD
    let maxSwapUsd = 0;
    const ethPrice = px.eth || 0;
    for (const h of swapHashes) {
      const t = okByHash[h];
      const ethUsd = t ? (Number(t.value || 0) / 1e18) * ethPrice : 0;
      const e20 = byHash[h];
      const stableUsd = e20?.stableUsd || 0;
      const anyUsd = e20?.anyUsd || 0;
      const candidate = Math.max(ethUsd, stableUsd, anyUsd);
      if (candidate > maxSwapUsd) maxSwapUsd = candidate;
    }

    // ========= Variety / Imaging =========
    const erc20Count = new Set((erc20 || []).map((t: any) => String(t.contractAddress || "").toLowerCase())).size;
    const nftCount = new Set((erc721 || []).map((t: any) => String(t.contractAddress || "").toLowerCase())).size;

    // ========= Dosage / Costs =========
    const totalVolumeEth = volumeEth;
    const gasEth = (ok || []).reduce((s: number, t: any) => {
      const gu = Number(t.gasUsed || t.gas || 0);
      const gp = Number(t.gasPrice || 0);
      return s + (gu * gp) / 1e18;
    }, 0);

    // ========= Deployed contracts =========
    const deployedContracts = (ok || []).filter((t: any) => {
      const to = String(t.to || "").toLowerCase();
      const created = String((t as any).contractAddress || "");
      return (to === "" || to === "0x0000000000000000000000000000000000000000") && created && t.isError === "0";
    }).length;

    // ========= Special Clinics =========
    const allTxsForProto = [
      ...(ok || []).map((t: any) => ({
        to: String(t.to || "").toLowerCase(),
        from: String(t.from || "").toLowerCase(),
        fn: String(t.functionName || "").toLowerCase(),
      })),
      ...(erc20 || []).map((t: any) => ({ to: String(t.to || "").toLowerCase(), from: String(t.from || "").toLowerCase(), fn: "" })),
      ...(erc721 || []).map((t: any) => ({ to: String(t.to || "").toLowerCase(), from: String(t.from || "").toLowerCase(), fn: "" })),
    ];
    function countProto(name: keyof typeof PROTOCOL_ADDRS) {
      const addrs = new Set(PROTOCOL_ADDRS[name].map((a) => a.toLowerCase()));
      const words = PROTOCOL_KEYWORDS[name];
      let c = 0;
      for (const t of allTxsForProto) {
        const hitByAddr = addrs.size > 0 && (addrs.has(t.to) || addrs.has(t.from));
        const hitByWord = words.some((w) => t.fn.includes(w));
        if (hitByAddr || hitByWord) c++;
      }
      return c;
    }
    const uniswap = countProto("uniswap");
    const sushi = countProto("sushi");
    const pancake = countProto("pancake");
    const aerodrome = countProto("aerodrome");
    const aave = countProto("aave");
    const limitless = countProto("limitless");
    const stargate = countProto("stargate");
    const metamask = countProto("metamask");
    const matcha = countProto("matcha");

    const lendingAny =
      aave > 0 ||
      allTxsForProto.some((t) => t.fn.includes("borrow") || t.fn.includes("repay") || t.fn.includes("liquidate"));

    const thresholds = {
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

    // ====== Onchain Lifestyle fields ======
    const allTxTimestampsUTC = Array.from(
      new Set<string>([
        ...(ok || []).map((t: any) => new Date(Number(t.timeStamp) * 1000).toISOString()),
        ...(erc20 || []).map((t: any) => new Date(Number(t.timeStamp) * 1000).toISOString()),
        ...(erc721 || []).map((t: any) => new Date(Number(t.timeStamp) * 1000).toISOString()),
      ])
    ).sort();

    const holidayDatesUTC = Array.from(
      new Set(allTxTimestampsUTC.map((iso) => iso.slice(0, 10)).filter((ymd) => HOLIDAYS_MM_DD.has(ymd.slice(5))))
    );

    // ====== Response ======
    return new Response(
      JSON.stringify({
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

        // Lifestyle
        allTxTimestampsUTC,
        mainnetLaunchUTC: BASE_MAINNET_LAUNCH,
        holidayDatesUTC,

        // Prescription Usage
        swaps,
        stablecoinTxs,
        usdcTrades,
        stablecoinTypes,
        maxSwapUsd,

        // Medication Variety / Imaging Records
        erc20Count,
        nftCount,

        // Onchain Dosage / Treatment Costs
        totalVolumeEth,
        gasEth,

        // Referrals
        usedNativeBridge: nativeBridgeUsed,
        usedThirdPartyBridge,
        relayCount: bridgeCounts["relay"] || 0,
        jumperCount: bridgeCounts["jumper"] || 0,
        bungeeCount: bridgeCounts["bungee"] || 0,
        acrossCount: bridgeCounts["across"] || 0,

        // Medical Staff
        deployedContracts,

        // Special Clinics
        uniswap,
        sushi,
        pancake,
        aerodrome,
        aave,
        limitless,
        stargate,
        metamask,
        matcha,
        lendingAny,
      }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e: any) {
    // اطبع للـ Logs الخاصة بـ Vercel
    console.error("summary.error", e);
    return new Response(JSON.stringify({ error: e?.message || "internal error" }), { status: 500 });
  }
}
