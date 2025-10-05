// config/protocols.ts

export type ProtoKey =
  | "uniswap" | "sushi" | "pancake" | "aerodrome"
  | "aave" | "limitless" | "stargate" | "metamask" | "matcha";

/**
 * كلمات مفتاحية احتياطية عند غياب العناوين أو لاكتشاف حالات إضافية.
 */
export const PROTOCOL_KEYWORDS: Record<ProtoKey, string[]> = {
  uniswap:   ["uniswap", "v3swap", "exactinput", "exactoutput", "universalrouter"],
  sushi:     ["sushi", "uniswapv2", "v2router"],
  pancake:   ["pancake", "pancakeswap", "smartrouter", "universalrouter"],
  aerodrome: ["aerodrome", "slipstream"],
  aave:      ["aave", "pool", "borrow", "repay", "supply", "withdraw"],
  limitless: ["limitless"],
  stargate:  ["stargate", "routereth"],
  metamask:  ["metamask", "mm", "router", "spender"],
  matcha:    ["matcha", "0x", "exchangeproxy", "transformerc"],
};

/**
 * قوائم العناوين المعروفة على Base (كلها lowercase للتطابق السريع).
 */
export const PROTOCOL_ADDRS: Record<ProtoKey, string[]> = {
  uniswap: [
    // Universal Router + SwapRouter02 على Base
    "0x6ff5693b99212da76ad316178a184ab56d299b43",
    "0x2626664c2603336e57b271c5c0b26f421741e481",
  ],
  sushi: [
    // Sushi V2 Router على Base
    "0x6bded42c6da8fbf0d2ba55b2fa120c5e0c8d7891",
  ],
  pancake: [
    // Pancake على Base
    "0xfe6508f0015c778bdcc1fb5465ba5ebe224c9912", // Universal Router
    "0x678aa4bf4e210cf2166753e054d5b7c31cc7fa86", // Smart Router (v3)
  ],
  aerodrome: [
    // Aerodrome على Base
    "0x6cb442acf35158d5eda88fe602221b67b400be3e", // Universal Router
    "0xbe6d8f0d05cc4be24d5167a3ef062215be6d18a5", // Slipstream Router
    "0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43", // Router بديل
  ],
  aave: [
    // Aave V3 على Base
    "0xa238dd80c259a72e81d7e4664a9801593f98d1c5", // Pool (Proxy)
    "0x8be473dcfa93132658821e67cbeb684ec8ea2e74", // PoolAddressesProvider
  ],
  stargate: [
    // Stargate على Base
    "0x45f1a95a4d3f3836523f5c83673c797f4d4d263b", // Router.sol
    "0x50b6ebc2103bfec165949cc946d739d5650d7ae4", // RouterETH.sol
    "0xaf54be5b6eec24d6bfacf1cce4eaf680a8239398", // Bridge.sol
  ],
  metamask: [
    // MetaMask Router (spender) على Base
    "0x9dda6ef3d919c9bc8885d5560999a3640431e8e6",
  ],
  matcha: [
    // 0x Exchange Proxy على Base (Matcha)
    "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
  ],
  limitless: [
    // لا توجد قائمة عناوين رسمية موثقة حاليًا — اتركها فارغة مؤقتًا
  ],
};

/* ------------------------------------------------------------------
   إضافات اختيارية مفيدة
------------------------------------------------------------------- */

const ensureLowerUnique = (arr: string[]) => {
  const s = new Set<string>();
  for (const a of arr) {
    const v = (a || "").toLowerCase();
    if (v) s.add(v);
  }
  return Array.from(s);
};

Object.keys(PROTOCOL_ADDRS).forEach((k) => {
  // تأكد أن أي تعديل مستقبلي يظل lowercase & unique
  // @ts-ignore
  PROTOCOL_ADDRS[k] = ensureLowerUnique(PROTOCOL_ADDRS[k as ProtoKey]);
});

/** نفس العناوين لكن كمجموعات Sets (اختياري للاستخدام داخل الـ API) */
export const PROTOCOL_ADDRS_SET: Record<ProtoKey, Set<string>> = Object.fromEntries(
  (Object.entries(PROTOCOL_ADDRS) as [ProtoKey, string[]][])
    .map(([k, list]) => [k, new Set(list)])
) as Record<ProtoKey, Set<string>>;
