/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { createPublicClient, http, isAddress } from "viem";
import { base } from "viem/chains";
import { NATIVE_BRIDGE_SENDERS_L2, THIRD_PARTY_BRIDGES } from "@/config/bridges";
import { getBasenameFor } from "@/app/lib/basename";
import { PROTOCOL_ADDRS, PROTOCOL_KEYWORDS } from "@/config/protocols";

/* ========= Types ========= */
type DeployedBreakdown = { direct?: number; internal?: number; receipt?: number; sample?: string[] };

type SummaryDiag = {
  startedAt: number;
  finishedAt?: number;
  total_ms?: number;
  steps: any[];
  counts?: { normal: number; erc20: number; erc721: number; internals: number };
  swapHashes?: string[];
  bridgeHits?: Record<string, number>;
  dexHits?: Record<string, number>;
  deployed?: DeployedBreakdown;
};

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

  deployedContracts: number;

  // special clinics
  uniswap: number; sushi: number; pancake: number; aerodrome: number; aave: number;
  limitless: number; stargate: number; metamask: number; lendingAny: boolean; matcha: number;

  _diag?: SummaryDiag;
};

/* ========= Env / constants ========= */
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "";
const ALCHEMY_BASE_RPC = process.env.ALCHEMY_BASE_RPC || "";
const COINGECKO_RAW = process.env.COINGECKO_API;

const CHAIN_ID_BASE = 8453;
const BASE_MAINNET_LAUNCH = "2023-08-09T00:00:00Z";
const HOLIDAYS_MM_DD = new Set(["03-30", "01-01", "12-25"]);

/* ========= Viem client ========= */
// بعض إصدارات viem أزالت rpcUrls.public — استخدم default.http[0]
const RPC_FALLBACK = base?.rpcUrls?.default?.http?.[0] || "https://mainnet.base.org";

const client = createPublicClient({
  chain: base,
  transport: http(ALCHEMY_BASE_RPC || RPC_FALLBACK),
});

/* ========= helpers ========= */
const nowSec = () => Math.floor(Date.now() / 1000);
const toStr = (v: any) => String(v ?? "");
const lc = (v: any) => toStr(v).toLowerCase();
const sIncludes = (hay: any, needle: any) => lc(hay).includes(lc(needle));
const ensureArray = <T,>(x: any): T[] => (Array.isArray(x) ? (x as T[]) : []);

function isHttpUrl(raw?: string | null): boolean {
  try {
    if (!raw) return false;
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 20000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(id);
  }
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 300 * (i + 1) + Math.random() * 200));
    }
  }
  throw last;
}

/* ========= Etherscan v2 ========= */
const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";
function v2url(p: Record<string, string>) {
  const u = new URL(ETHERSCAN_V2);
  u.searchParams.set("chainid", String(CHAIN_ID_BASE));
  for (const k in p) u.searchParams.set(k, p[k]);
  if (ETHERSCAN_API_KEY) u.searchParams.set("apikey", ETHERSCAN_API_KEY);
  return u.toString();
}
async function etherscanV2(p: Record<string, string>) {
  return withRetry(async () => {
    const r = await fetchWithTimeout(v2url(p));
    const j = await r.json().catch(() => null);
    if (!j) throw new Error("etherscan_v2_parse_error");
    return j as any;
  });
}

/* === جلب كل صفحات معاملات العنوان (لتفادي سقف 5000) === */
async function fetchAllNormalTxs(address: string, sort: "asc" | "desc" = "asc", pageSize = 5000) {
  let page = 1;
  const out: any[] = [];
  while (true) {
    const res = await etherscanV2({
      module: "account",
      action: "txlist",
      address,
      startblock: "0",
      endblock: "99999999",
      page: String(page),
      offset: String(pageSize),
      sort,
    });
    const batch = ensureArray<any>(res?.result);
    out.push(...batch);
    if (batch.length < pageSize) break;
    page++;
    // تخفيف ضغط المعدّل
    await new Promise((r) => setTimeout(r, 150));
  }
  return out;
}

/* === Trace by txhash (لالتقاط نشرات factory) === */
async function fetchInternalsByTxHashes(hashes: string[], concurrency = 5) {
  const out: any[] = [];
  let i = 0;
  async function worker() {
    while (i < hashes.length) {
      const h = hashes[i++];
      try {
        const res = await etherscanV2({ module: "account", action: "txlistinternal", txhash: h });
        out.push(...ensureArray<any>(res?.result));
      } catch {
        /* skip one-off error */
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, hashes.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

/* === جلب إيصالات المعاملات لالتقاط contractAddress من الإيصال === */
async function fetchReceiptsByHashes(hashes: string[], concurrency = 6) {
  const results: Record<string, { contractAddress?: string | null }> = {};
  let i = 0;
  async function worker() {
    while (i < hashes.length) {
      const h = hashes[i++];
      try {
        const rcpt = await client.getTransactionReceipt({ hash: h as `0x${string}` });
        results[h] = { contractAddress: rcpt.contractAddress ?? null };
      } catch {
        results[h] = { contractAddress: null };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, hashes.length) }, () => worker()));
  return results;
}

/* ========= CoinGecko ========= */
const DEFAULT_CG_URL = "https://api.coingecko.com/api/v3/simple/price";
async function prices() {
  const baseUrl = isHttpUrl(COINGECKO_RAW) ? (COINGECKO_RAW as string) : DEFAULT_CG_URL;
  const key = isHttpUrl(COINGECKO_RAW) ? (process.env.COINGECKO_API_KEY || "") : (COINGECKO_RAW || "");
  const u = new URL(baseUrl);
  if (!u.pathname.endsWith("/simple/price")) u.pathname = "/api/v3/simple/price";
  u.searchParams.set("ids", "ethereum,usd-coin");
  u.searchParams.set("vs_currencies", "usd");
  const headers: Record<string, string> = {};
  if (key) headers["x-cg-demo-api-key"] = headers["x-cg-pro-api-key"] = key as string;
  try {
    const r = await withRetry(() => fetchWithTimeout(u.toString(), { headers }));
    if (!("ok" in r) || !r.ok) return { eth: 0, usdc: 1 };
    const j = await r.json().catch(() => null);
    if (!j) return { eth: 0, usdc: 1 };
    return { eth: j?.ethereum?.usd ?? 0, usdc: j?.["usd-coin"]?.usd ?? 1 };
  } catch {
    return { eth: 0, usdc: 1 };
  }
}

/* ========= Utilities ========= */
const isoDay = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
function isoWeek(ts: number) {
  const d0 = new Date(ts * 1000);
  const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate()));
  const dn = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dn);
  const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wn = Math.ceil(((+d - +ys) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(wn).padStart(2, "0")}`;
}
const isoMonth = (t: number) => new Date(t * 1000).toISOString().slice(0, 7);

async function isContract(addr: string) {
  try {
    const code = await client.getCode({ address: addr as `0x${string}` });
    return code && code !== "0x";
  } catch {
    return false;
  }
}

/* ========= name/address resolver ========= */
async function resolveAddressOrName(input: string | null) {
  if (!input) return null;
  const s = input.trim();
  if (s.startsWith("0x") && isAddress(s as `0x${string}`)) return s.toLowerCase();
  if (s.includes(".")) {
    try {
      const r = await fetchWithTimeout(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(s)}`);
      if (!r.ok) return null;
      const j = await r.json().catch(() => null);
      const addr = j?.address || j?.addr;
      if (addr && isAddress(addr as `0x${string}`)) return (addr as string).toLowerCase();
    } catch {}
  }
  return null;
}

/* ========= Route ========= */
export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const diag: SummaryDiag = { startedAt, steps: [] };

  try {
    if (req.nextUrl.searchParams.get("debug") === "ping") {
      return new Response(JSON.stringify({ ok: true, note: "alive" }), {
        headers: { "content-type": "application/json" },
      });
    }

    const raw = (req.nextUrl.searchParams.get("address") || "").trim();
    const address = await resolveAddressOrName(raw);
    if (!address) return new Response(JSON.stringify({ error: "Invalid address or name" }), { status: 400 });

    const baseEns =
      raw.includes(".") && raw.toLowerCase().endsWith(".base.eth")
        ? raw.toLowerCase()
        : await getBasenameFor(address);

    /* ---- fetch tx lists ---- */
    const t0 = Date.now();
    // معاملات عادية — جميع الصفحات
    const normal = await fetchAllNormalTxs(address, "asc", 5000);
    // ERC20 / ERC721 صفحة واحدة تكفي غالبًا (زدها لاحقًا عند الحاجة)
    const [erc20Res, erc721Res] = await Promise.all([
      etherscanV2({
        module: "account",
        action: "tokentx",
        address,
        startblock: "0",
        endblock: "99999999",
        page: "1",
        offset: "5000",
        sort: "asc",
      }),
      etherscanV2({
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

    const erc20 = ensureArray<any>((erc20Res as any)?.result);
    const erc721 = ensureArray<any>((erc721Res as any)?.result);

    const ok = normal.filter((t) => String(t.isError) === "0");

    // txhashes التي أرسلتها (لنستخرج داخليًا create/create2 + receipt.contractAddress)
    const sentHashesAll = ok
      .filter((t) => lc(t.from) === address.toLowerCase())
      .map((t) => toStr(t.hash))
      .filter(Boolean);

    const MAX_TRACE = 400;         // للـ traces
    const MAX_RECEIPTS = 600;      // للـ receipts
    const sentHashesTrace = sentHashesAll.slice(-MAX_TRACE);
    const sentHashesRcpt = sentHashesAll.slice(-MAX_RECEIPTS);

    const [internalsByTx, receiptsMap] = await Promise.all([
      fetchInternalsByTxHashes(sentHashesTrace, 6),
      fetchReceiptsByHashes(sentHashesRcpt, 6),
    ]);

    const internalDeploys = internalsByTx
      .filter(
        (it) =>
          ["create", "create2"].includes(lc(it.type)) &&
          String(it.isError) === "0" &&
          isAddress(toStr(it.contractAddress) as `0x${string}`)
      )
      .map((it) => lc(it.contractAddress));

    const receiptCreates = Object.values(receiptsMap)
      .map((r) => toStr(r.contractAddress || "").toLowerCase())
      .filter((x) => x && isAddress(x as `0x${string}`));

    diag.steps.push({
      etherscan_ms: Date.now() - t0,
      normal_pages: Math.ceil(normal.length / 5000),
      erc20_status: (erc20Res as any)?.status,
      erc721_status: (erc721Res as any)?.status,
      traced_hashes: sentHashesTrace.length,
      traced_found_creates: internalDeploys.length,
      receipts_checked: sentHashesRcpt.length,
      receipt_creates: receiptCreates.length,
    });

    /* ---- basic stats ---- */
    const now = nowSec();
    const firstTxAt = ok[0] ? Number(ok[0].timeStamp) : null;
    const walletAgeDays = firstTxAt ? Math.floor((now - firstTxAt) / 86400) : 0;

    const days = new Set<string>(),
      weeks = new Set<string>(),
      months = new Set<string>();
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
    const tokenTxs = erc20.length + erc721.length;

    // contracts interacted with
    const toSet = new Set<string>();
    for (const t of ok) if (t.to) toSet.add(lc(t.to));
    const toArr = [...toSet];
    const flags = await Promise.all(toArr.map((a) => isContract(a)));
    const cset = new Set<string>();
    for (let i = 0; i < toArr.length; i++) if (flags[i]) cset.add(toArr[i]);
    const uniqueContractInteractions = cset.size;
    const totalContractInteractions = ok.filter((t) => t.to && cset.has(lc(t.to))).length;

    /* ===== Bridges (native + 3rd party) — robust detection ===== */
    let depositedEth = 0;
    let nativeBridgeUsed = false;
    let usedThirdPartyBridge = false;

    type BridgeSets = { [k: string]: { addrs: Set<string> } };
    const thirdParty: BridgeSets = {};
    for (const k of Object.keys(THIRD_PARTY_BRIDGES ?? {})) {
      const arr: string[] = (THIRD_PARTY_BRIDGES as any)[k]?.contracts ?? [];
      thirdParty[k] = { addrs: new Set(arr.map((x: string) => x?.toLowerCase()).filter(Boolean)) };
    }
    const thirdPartyKeys = Object.keys(thirdParty);
    const bridgeCounts: Record<string, number> = {};
    for (const k of thirdPartyKeys) bridgeCounts[k] = 0;

    // عقود الجسر الرسمي على L2 (سحب L2→L1) — عدّل إذا عندك عناوين أدق
    const NATIVE_L2_OUT = new Set(
      ["0x4200000000000000000000000000000000000010", "0x4200000000000000000000000000000000000011"].map((x) =>
        x.toLowerCase()
      )
    );

    // ETH txs
    for (const t of ok) {
      const from = (t.from || "").toLowerCase();
      const to = (t.to || "").toLowerCase();
      const valEth = Number(t.value || 0) / 1e18;

      if (to === address.toLowerCase()) {
        if ((NATIVE_BRIDGE_SENDERS_L2 ?? []).map((x) => x.toLowerCase()).includes(from)) {
          nativeBridgeUsed = true;
          depositedEth += valEth;
        }
      }
      if (from === address.toLowerCase() && NATIVE_L2_OUT.has(to)) nativeBridgeUsed = true;

      for (const k of thirdPartyKeys) {
        const set = thirdParty[k].addrs;
        if (set.has(from) || set.has(to)) {
          usedThirdPartyBridge = true;
          bridgeCounts[k] = (bridgeCounts[k] || 0) + 1;
        }
      }
    }

    // ERC20 transfers (الجسور الخارجية غالبًا تظهر هنا)
    for (const tr of erc20) {
      const from = (tr.from || "").toLowerCase();
      const to = (tr.to || "").toLowerCase();
      const ca = (tr.contractAddress || "").toLowerCase();

      if (from === address.toLowerCase() && NATIVE_L2_OUT.has(to)) nativeBridgeUsed = true;
      if (to === address.toLowerCase() && NATIVE_L2_OUT.has(from)) nativeBridgeUsed = true;

      for (const k of thirdPartyKeys) {
        const set = thirdParty[k].addrs;
        if (set.has(from) || set.has(to) || set.has(ca)) {
          usedThirdPartyBridge = true;
          bridgeCounts[k] = (bridgeCounts[k] || 0) + 1;
        }
      }
    }

    /* ---- prices / balances ---- */
    const px = await prices();
    const volumeEth = ok.reduce((s, t) => s + Number(t.value) / 1e18, 0);
    const volumeEthUSD = volumeEth * (px.eth || 0);

    const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    let usdcAmount = 0;
    for (const tr of erc20)
      if (lc(tr.contractAddress) === lc(USDC)) {
        const dec = Number(tr.tokenDecimal || 6);
        usdcAmount += Number(tr.value) / 10 ** dec;
      }
    const volumeUsdTotal = volumeEthUSD + usdcAmount * (px.usdc || 1);

    const balRes = await etherscanV2({ module: "account", action: "balance", address, tag: "latest" });
    let wei = "0";
    if (typeof (balRes as any)?.result === "string") wei = (balRes as any).result;
    else if ((balRes as any)?.result?.balance) wei = (balRes as any).result.balance;
    const balanceEth = Number(wei) / 1e18;

    /* ---- swaps detection ---- */
    const DEX_KEYS = ["uniswap", "pancake", "sushi", "aerodrome", "matcha"] as const;
    const DEX_ROUTER_SET = new Set<string>();
    for (const k of DEX_KEYS)
      (Array.isArray((PROTOCOL_ADDRS as any)[k]) ? (PROTOCOL_ADDRS as any)[k] : []).forEach((a: string) =>
        DEX_ROUTER_SET.add(lc(a))
      );
    const SWAP_WORDS = [
      "swap",
      "exactinput",
      "exactoutput",
      "universalrouter",
      "v3swap",
      ...(((PROTOCOL_KEYWORDS as any).uniswap ?? [])),
      ...(((PROTOCOL_KEYWORDS as any).pancake ?? [])),
      ...(((PROTOCOL_KEYWORDS as any).sushi ?? [])),
      ...(((PROTOCOL_KEYWORDS as any).aerodrome ?? [])),
      ...(((PROTOCOL_KEYWORDS as any).matcha ?? [])),
    ].map((s: string) => lc(s));

    const byHash: Record<string, { hasIn: boolean; hasOut: boolean; stableUsd: number; anyUsd: number }> = {};
    const STABLE_SYMBOLS = new Set(["USDC", "USDBC", "USDT", "DAI", "FRAX", "USDE", "LUSD"]);
    for (const tr of erc20) {
      const h = toStr(tr.hash || tr.transactionHash);
      if (!h) continue;
      const from = lc(tr.from),
        to = lc(tr.to),
        dec = Number(tr.tokenDecimal || 6),
        sym = toStr(tr.tokenSymbol).toUpperCase(),
        val = Number(tr.value || 0);
      if (!byHash[h]) byHash[h] = { hasIn: false, hasOut: false, stableUsd: 0, anyUsd: 0 };
      if (to === address.toLowerCase()) byHash[h].hasIn = true;
      if (from === address.toLowerCase()) byHash[h].hasOut = true;
      const stableUsd = STABLE_SYMBOLS.has(sym) ? val / 10 ** dec : 0;
      const anyUsd = val / 10 ** dec;
      if (stableUsd > byHash[h].stableUsd) byHash[h].stableUsd = stableUsd;
      if (anyUsd > byHash[h].anyUsd) byHash[h].anyUsd = anyUsd;
    }

    const looksLikeSwap = (t: any) => {
      const fn = lc(t.functionName);
      const to = lc(t.to);
      const from = lc(t.from);
      return (
        (Array.isArray(SWAP_WORDS) && SWAP_WORDS.some((w: string) => sIncludes(fn, w))) ||
        DEX_ROUTER_SET.has(to) ||
        DEX_ROUTER_SET.has(from)
      );
    };

    const swapHashes = new Set<string>(),
      okByHash: Record<string, any> = {};
    for (const t of ok) {
      const h = toStr(t.hash);
      if (h) okByHash[h] = t;
      if (looksLikeSwap(t) && h) swapHashes.add(h);
    }
    for (const [h, agg] of Object.entries(byHash)) if (agg.hasIn && agg.hasOut) swapHashes.add(h);
    const swaps = swapHashes.size;

    const stableTransfers = erc20.filter((tr) => STABLE_SYMBOLS.has(toStr(tr.tokenSymbol).toUpperCase()));
    const stablecoinTxs = stableTransfers.length;
    const usdcTrades = erc20.filter((tr) => toStr(tr.tokenSymbol).toUpperCase() === "USDC" && swapHashes.has(toStr(tr.hash || tr.transactionHash))).length;
    const stablecoinTypes = new Set(
      stableTransfers
        .filter((tr) => swapHashes.has(toStr(tr.hash || tr.transactionHash)))
        .map((tr) => toStr(tr.tokenSymbol).toUpperCase())
    ).size;

    let maxSwapUsd = 0;
    const ethPrice = px.eth || 0;
    for (const h of swapHashes) {
      const t = okByHash[h];
      const ethUsd = t ? (Number(t.value || 0) / 1e18) * ethPrice : 0;
      const e20 = byHash[h];
      const stableUsd = (e20 && e20.stableUsd) || 0;
      const anyUsd = (e20 && e20.anyUsd) || 0;
      maxSwapUsd = Math.max(maxSwapUsd, ethUsd, stableUsd, anyUsd);
    }

    // variety & costs
    const erc20Count = new Set(erc20.map((t) => lc(t.contractAddress))).size;
    const nftCount = new Set(erc721.map((t) => lc(t.contractAddress))).size;
    const totalVolumeEth = volumeEth;
    const gasEth = ok.reduce((s, t) => {
      const gu = Number(t.gasUsed ?? t.gas ?? 0);
      const gp = Number(t.gasPrice ?? 0);
      return gu && gp ? s + (gu * gp) / 1e18 : s;
    }, 0);

    // direct & internal & receipt deploys
    const directDeploys = ok
      .filter((t) => {
        const to = lc(t.to);
        const created = toStr(t.contractAddress);
        return (to === "" || to === "0x0000000000000000000000000000000000000000") && created && String(t.isError) === "0";
      })
      .map((t) => lc(t.contractAddress));

    const deployedSet = new Set<string>([
      ...directDeploys,
      ...internalDeploys,
      ...receiptCreates,
    ]);
    const deployedContracts = deployedSet.size;

    // Special clinics
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
        const to = toStr(t.to),
          from = toStr(t.from),
          fn = toStr(t.fn);
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
      aave > 0 ||
      allTxsForProto.some((t) => {
        const f = toStr(t.fn);
        return sIncludes(f, "borrow") || sIncludes(f, "repay") || sIncludes(f, "liquidate");
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

    // lifestyle timestamps
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
      deployedContracts,
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
    };

    if (req.nextUrl.searchParams.get("debug") === "diag") {
      diag.finishedAt = Date.now();
      diag.total_ms = diag.finishedAt - startedAt;
      body._diag = {
        ...diag,
        counts: { normal: normal.length, erc20: erc20.length, erc721: erc721.length, internals: internalDeploys.length },
        swapHashes: Array.from(new Set(sentHashesTrace)).slice(0, 100),
        bridgeHits: { ...bridgeCounts, native: nativeBridgeUsed ? 1 : 0 },
        dexHits: Object.fromEntries(Object.keys(PROTOCOL_ADDRS as any).map((k) => [k, 0])),
        deployed: {
          direct: new Set(directDeploys).size,
          internal: new Set(internalDeploys).size,
          receipt: new Set(receiptCreates).size,
          sample: Array.from(new Set([...directDeploys, ...internalDeploys, ...receiptCreates])).slice(0, 20),
        },
      };
    }

    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json", "cache-control": "no-store, max-age=0" },
    });
  } catch (e: any) {
    console.error("summary.error", e);
    return new Response(JSON.stringify({ error: e?.message || "internal error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
