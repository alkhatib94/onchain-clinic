// scripts/discover-protocols.ts
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const MY_WALLET = (process.env.MY_WALLET || "").toLowerCase();

const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";
const BASESCAN_V1 = "https://api.basescan.org/api"; // getsourcecode (v1)
const CHAIN_ID_BASE = 8453;

type ProtoKey =
  | "uniswap"
  | "sushi"
  | "pancake"
  | "aerodrome"
  | "aave"
  | "limitless"
  | "stargate"
  | "metamask"
  | "matcha";

const KEYWORDS: Record<ProtoKey, string[]> = {
  uniswap: ["uniswap", "v3swap", "exactinput", "exactoutput"],
  sushi: ["sushi"],
  pancake: ["pancake"],
  aerodrome: ["aerodrome"],
  aave: ["aave", "pool", "lending"],
  limitless: ["limitless"],
  stargate: ["stargate"],
  metamask: ["metamask"],
  matcha: ["matcha", "0x protocol", "0x exchange", "0x"]
};

function v2url(p: Record<string, string>) {
  const u = new URL(ETHERSCAN_V2_BASE);
  u.searchParams.set("chainid", String(CHAIN_ID_BASE));
  for (const k in p) u.searchParams.set(k, p[k]);
  if (BASESCAN_API_KEY) u.searchParams.set("apikey", BASESCAN_API_KEY);
  return u.toString();
}

async function fetchJSON(url: string) {
  const r = await fetch(url as any, { cache: "no-store" as any });
  if (!r.ok) throw new Error("http " + r.status);
  return r.json();
}

async function getNormalTxs(addr: string) {
  const url = v2url({
    module: "account",
    action: "txlist",
    address: addr,
    startblock: "0",
    endblock: "99999999",
    page: "1",
    offset: "10000",
    sort: "asc"
  });
  const j = await fetchJSON(url);
  return j?.result ?? [];
}

async function isContract(addr: string): Promise<boolean> {
  const u = new URL(BASESCAN_V1);
  u.searchParams.set("module", "contract");
  u.searchParams.set("action", "getsourcecode");
  u.searchParams.set("address", addr);
  if (BASESCAN_API_KEY) u.searchParams.set("apikey", BASESCAN_API_KEY);
  const j = await fetchJSON(u.toString());
  const row = Array.isArray(j?.result) ? j.result[0] : null;
  const name = (row?.ContractName || "").trim();
  const src = (row?.SourceCode || "").trim();
  return Boolean(name || src);
}

async function getSourceBlob(addr: string) {
  const u = new URL(BASESCAN_V1);
  u.searchParams.set("module", "contract");
  u.searchParams.set("action", "getsourcecode");
  u.searchParams.set("address", addr);
  if (BASESCAN_API_KEY) u.searchParams.set("apikey", BASESCAN_API_KEY);
  const j = await fetchJSON(u.toString());
  const row = Array.isArray(j?.result) ? j.result[0] : null;
  return `${row?.ContractName || ""} ${row?.SourceCode || ""}`;
}

function matchKeyword(s: string, words: string[]) {
  const L = s.toLowerCase();
  return words.some((w) => L.includes(w.toLowerCase()));
}

/** 1) إبني Seeds تلقائياً من محفظتك + جيرانها */
async function buildSeedsFromMyWallet(): Promise<string[]> {
  if (!MY_WALLET) throw new Error("ضع MY_WALLET في .env");
  console.log("🌱 Starting from MY_WALLET:", MY_WALLET);

  const myTxs = await getNormalTxs(MY_WALLET);
  const neighborFreq = new Map<string, number>();
  for (const t of myTxs) {
    if (String(t.isError || "0") !== "0") continue;
    const to = String(t.to || "").toLowerCase();
    const from = String(t.from || "").toLowerCase();
    const other = from === MY_WALLET ? to : from;
    if (!other) continue;
    neighborFreq.set(other, (neighborFreq.get(other) || 0) + 1);
  }

  // خذ الأكثر تكراراً كمرشحين أوليين
  const prelim: string[] = [];
  for (const [addr] of neighborFreq) prelim.push(addr);
  prelim.sort((a, b) => (neighborFreq.get(b)! - neighborFreq.get(a)!));

  const seeds: string[] = [MY_WALLET];
  for (const n of prelim) {
    try {
      const ic = await isContract(n);
      if (!ic && !seeds.includes(n)) seeds.push(n);
      if (seeds.length >= 12) break;
    } catch {
      // تجاهل
    }
  }
  console.log("✅ Built seeds:", seeds.length, "EOAs");
  return seeds;
}

/** 2) استكشف العقود من معاملات الـseeds وحدد البروتوكولات */
async function discoverProtocolsFromSeeds(seeds: string[]) {
  const toFreq = new Map<string, number>();
  for (const a of seeds) {
    console.log("🔎 scanning txs for seed", a);
    const txs = await getNormalTxs(a);
    for (const t of txs) {
      const to = String(t.to || "").toLowerCase();
      if (!to || String(t.isError || "0") !== "0") continue;
      toFreq.set(to, (toFreq.get(to) || 0) + 1);
    }
  }

  const candidates: string[] = [];
  for (const [addr] of toFreq) candidates.push(addr);
  candidates.sort((a, b) => (toFreq.get(b)! - toFreq.get(a)!));

  // لا تفحص أكثر من 1000 عقد
  const limited = candidates.slice(0, 1000);

  const out: Record<ProtoKey, string[]> = {
    uniswap: [],
    sushi: [],
    pancake: [],
    aerodrome: [],
    aave: [],
    limitless: [],
    stargate: [],
    metamask: [],
    matcha: []
  };

  console.log("🧪 checking", limited.length, "candidate contracts…");
  for (const addr of limited) {
    try {
      // لازم يكون عقد فعلاً
      const isC = await isContract(addr);
      if (!isC) continue;

      const blob = await getSourceBlob(addr);
      for (const k of Object.keys(KEYWORDS) as ProtoKey[]) {
        if (matchKeyword(blob, KEYWORDS[k])) {
          if (!out[k].includes(addr)) out[k].push(addr);
        }
      }
    } catch {
      // تجاهل
    }
  }
  return out;
}

async function run() {
  if (!BASESCAN_API_KEY) {
    console.warn("⚠️ ضع BASESCAN_API_KEY في .env لنتائج أفضل");
  }

  const seeds = await buildSeedsFromMyWallet();
  const discovered = await discoverProtocolsFromSeeds(seeds);

  const target = path.resolve(process.cwd(), "config/protocols.ts");
  const body = `export type ProtoKey =
  | "uniswap" | "sushi" | "pancake" | "aerodrome"
  | "aave" | "limitless" | "stargate" | "metamask" | "matcha";

export const PROTOCOL_ADDRS: Record<ProtoKey, string[]> = ${JSON.stringify(
    discovered,
    null,
    2
  )};

export const PROTOCOL_KEYWORDS: Record<ProtoKey, string[]> = ${JSON.stringify(
    KEYWORDS,
    null,
    2
  )};

// NOTE: تم توليده تلقائياً — راجع القوائم وخفّضها لأهم العقود (router/factory/pool)
`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
  console.log("✅ wrote", target);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
