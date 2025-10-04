import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ALCHEMY_BASE_RPC: process.env.ALCHEMY_BASE_RPC ? "✅ موجود" : "❌ مفقود",
    BASESCAN_API_KEY: process.env.BASESCAN_API_KEY ? "✅ موجود" : "❌ مفقود",
    COINGECKO_API: process.env.COINGECKO_API ? "✅ موجود" : "❌ مفقود",
    NODE_ENV: process.env.NODE_ENV,
  });
}
