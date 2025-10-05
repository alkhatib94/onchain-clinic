/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { createPublicClient, http, isAddress } from "viem";
import { base } from "viem/chains";
import { lc, toStr, ensureArray, etherscanV2, fetchWithTimeout } from "@/app/api/summary/_shared/utils";

const client = createPublicClient({
  chain: base,
  transport: http(process.env.ALCHEMY_BASE_RPC || "https://mainnet.base.org"),
});

async function fetchInternalsByTxHashes(hashes: string[], concurrency = 4) {
  const out: any[] = [];
  let i = 0;
  async function worker() {
    while (i < hashes.length) {
      const h = hashes[i++];
      try {
        const res = await etherscanV2({ module: "account", action: "txlistinternal", txhash: h });
        out.push(...ensureArray<any>(res?.result));
      } catch {/* ignore */}
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, hashes.length) }, () => worker()));
  return out;
}

async function fetchReceiptsByHashes(hashes: string[], concurrency = 4) {
  const results: Record<string, { contractAddress?: string | null }> = {};
  let i = 0;
  async function worker() {
    while (i < hashes.length) {
      const h = hashes[i++];
      try {
        const rcpt = await client.getTransactionReceipt({ hash: h as `0x${string}` });
        results[h] = { contractAddress: rcpt.contractAddress ?? null };
      } catch { results[h] = { contractAddress: null }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, hashes.length) }, () => worker()));
  return results;
}

async function isContract(addr: string) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const code = await client.getCode({ address: addr as `0x${string}` } as any);
    clearTimeout(t);
    return code && code !== "0x";
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const raw = (sp.get("address") || "").trim().toLowerCase();
  if (!raw || !raw.startsWith("0x") || !isAddress(raw as `0x${string}`)) {
    return new Response(JSON.stringify({ error: "invalid address" }), { status: 400 });
  }
  const address = raw as `0x${string}`;

  // اجلب آخر معاملات كافية لاستخراج النشرات/الإيصالات + العقود المتفاعَل معها
  const normalRes = await etherscanV2({
    module: "account", action: "txlist", address,
    startblock: "0", endblock: "99999999", page: "1", offset: "4000", sort: "asc",
  });
  const ok = ensureArray<any>(normalRes?.result).filter((t) => String(t.isError) === "0");

  // دقّة نشر العقود: internals + receipts
  const sentHashesAll = ok.filter((t:any)=> lc(t.from)===address).map((t:any)=> toStr(t.hash)).filter(Boolean);
  const MAX_TRACE = 150, MAX_RECEIPTS = 250;
  const [internals, receipts] = await Promise.all([
    fetchInternalsByTxHashes(sentHashesAll.slice(-MAX_TRACE), 4),
    fetchReceiptsByHashes(sentHashesAll.slice(-MAX_RECEIPTS), 4),
  ]);
  const internalCreates = new Set(
    ensureArray<any>(internals)
      .filter((it) => ["create","create2"].includes(lc(it.type)) && String(it.isError) === "0")
      .map((it) => lc(it.contractAddress)).filter(Boolean)
  );
  const receiptCreates = new Set(
    Object.values(receipts).map((r:any)=> lc(toStr(r.contractAddress||""))).filter(Boolean)
  );

  // direct creates من normal (احتياط)
  const directCreates = new Set(
    ok.filter((t:any) => {
      const to = lc(t.to); const created = toStr(t.contractAddress);
      return (to === "" || to === "0x0000000000000000000000000000000000000000") && created && String(t.isError) === "0";
    }).map((t:any)=> lc(t.contractAddress))
  );

  const deployedContracts = new Set<string>([
    ...directCreates, ...internalCreates, ...receiptCreates,
  ]).size;

  // حساب دقيق لتفاعلات العقود عبر getCode (تزامن محدود)
  const tos = Array.from(new Set(ok.map((t:any)=> lc(t.to)).filter(Boolean)));
  const LIMIT = 300; // سقف آمن
  const toArr = tos.slice(0, LIMIT);
  const results: boolean[] = [];
  let i = 0;
  const conc = 8;
  await Promise.all(Array.from({ length: conc }, async () => {
    while (i < toArr.length) {
      const idx = i++; const a = toArr[idx];
      try {
  const val = await isContract(a);
  results[idx] = val ?? false;     // ← يضمن boolean فقط
} catch {
  results[idx] = false;
}

    }
  }));
  const contractSet = new Set<string>();
  for (let j = 0; j < toArr.length; j++) if (results[j]) contractSet.add(toArr[j]);
  const uniqueInteractions = contractSet.size;
  const totalInteractions = ok.filter((t:any)=> !!t.to && contractSet.has(lc(t.to))).length;

  // Patch للـ schema الحالي (تُدمجه الواجهة فوق Core)
  return new Response(JSON.stringify({
    deployedContracts,
    contracts: { uniqueInteractions, totalInteractions },
    partial: false
  }), { headers: { "content-type": "application/json", "cache-control": "no-store" }});
}
