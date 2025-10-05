/* eslint-disable @typescript-eslint/no-explicit-any */
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "";
const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";
export const CHAIN_ID_BASE = 8453;

export const nowSec = () => Math.floor(Date.now() / 1000);
export const toStr = (v: any) => String(v ?? "");
export const lc = (v: any) => toStr(v).toLowerCase();
export const sIncludes = (hay: any, needle: any) => lc(hay).includes(lc(needle));
export const ensureArray = <T,>(x: any): T[] => (Array.isArray(x) ? (x as T[]) : []);

export function isHttpUrl(raw?: string | null): boolean {
  try {
    if (!raw) return false;
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 9000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally { clearTimeout(id); }
}

export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { last = e; await new Promise(r => setTimeout(r, 300 * (i + 1) + Math.random() * 200)); }
  }
  throw last;
}

export function v2url(p: Record<string, string>) {
  const u = new URL(ETHERSCAN_V2);
  u.searchParams.set("chainid", String(CHAIN_ID_BASE));
  for (const k in p) u.searchParams.set(k, p[k]);
  if (ETHERSCAN_API_KEY) u.searchParams.set("apikey", ETHERSCAN_API_KEY);
  return u.toString();
}

export async function etherscanV2(p: Record<string, string>) {
  return withRetry(async () => {
    const r = await fetchWithTimeout(v2url(p));
    const j = await r.json().catch(() => null);
    if (!j) throw new Error("etherscan_v2_parse_error");
    return j as any;
  });
}

const DEFAULT_CG_URL = "https://api.coingecko.com/api/v3/simple/price";
export async function prices() {
  const raw = process.env.COINGECKO_API;
  const baseUrl = isHttpUrl(raw) ? (raw as string) : DEFAULT_CG_URL;
  const key = isHttpUrl(raw) ? (process.env.COINGECKO_API_KEY || "") : (raw || "");
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
  } catch { return { eth: 0, usdc: 1 }; }
}

export const isoDay = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
export function isoWeek(ts: number) {
  const d0 = new Date(ts * 1000);
  const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate()));
  const dn = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dn);
  const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wn = Math.ceil(((+d - +ys) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(wn).padStart(2, "0")}`;
}
export const isoMonth = (t: number) => new Date(t * 1000).toISOString().slice(0, 7);
