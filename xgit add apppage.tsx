[35mapp/api/summary/route.ts[m[36m:[m[32m226[m[36m:[m    const DEX_KEYS: (keyof typeof PROTOCOL_ADDRS)[] = ["uniswap", "[1;31mpancake[m", "[1;31msushi[m", "aerodrome", "matcha"];
[35mapp/api/summary/route.ts[m[36m:[m[32m232[m[36m:[m      ...PROTOCOL_KEYWORDS.[1;31mpancake[m,
[35mapp/api/summary/route.ts[m[36m:[m[32m233[m[36m:[m      ...PROTOCOL_KEYWORDS.[1;31msushi[m,
[35mapp/api/summary/route.ts[m[36m:[m[32m353[m[36m:[m    const [1;31msushi[m = countProto("[1;31msushi[m");
[35mapp/api/summary/route.ts[m[36m:[m[32m354[m[36m:[m    const [1;31mpancake[m = countProto("[1;31mpancake[m");
[35mapp/api/summary/route.ts[m[36m:[m[32m357[m[36m:[m    const [1;31mlimitless[m = countProto("[1;31mlimitless[m");
[35mapp/api/summary/route.ts[m[36m:[m[32m449[m[36m:[m        [1;31msushi[m,
[35mapp/api/summary/route.ts[m[36m:[m[32m450[m[36m:[m        [1;31mpancake[m,
[35mapp/api/summary/route.ts[m[36m:[m[32m453[m[36m:[m        [1;31mlimitless[m,
[35mapp/badges/BadgesGrid.tsx[m[36m:[m[32m47[m[36m:[m  // SpecialClinics-only (بدون [1;31msushi[m/[1;31mpancake[m/[1;31mlimitless[m)
[35mapp/page.tsx[m[36m:[m[32m58[m[36m:[m  [1;31msushi[m?: number;
[35mapp/page.tsx[m[36m:[m[32m59[m[36m:[m  [1;31mpancake[m?: number;
[35mapp/page.tsx[m[36m:[m[32m62[m[36m:[m  [1;31mlimitless[m?: number;
[35mapp/page.tsx[m[36m:[m[32m231[m[36m:[m          [1;31msushi[m={s?.[1;31msushi[m ?? 0}
[35mapp/page.tsx[m[36m:[m[32m232[m[36m:[m          [1;31mpancake[m={s?.[1;31mpancake[m ?? 0}
[35mapp/page.tsx[m[36m:[m[32m235[m[36m:[m          [1;31mlimitless[m={s?.[1;31mlimitless[m ?? 0}
[35mcomponents/DoctorSummary.tsx[m[36m:[m[32m184[m[36m:[m  if (includesAny(s, ["swap", "dex", "uniswap", "aerodrome", "matcha", "[1;31mpancake[m", "[1;31msushi[m"])) {
[35mconfig/protocols.ts[m[36m:[m[32m4[m[36m:[m  | "uniswap" | "[1;31msushi[m" | "[1;31mpancake[m" | "aerodrome"
[35mconfig/protocols.ts[m[36m:[m[32m5[m[36m:[m  | "aave" | "[1;31mlimitless[m" | "stargate" | "metamask" | "matcha";
[35mconfig/protocols.ts[m[36m:[m[32m10[m[36m:[m  [1;31msushi[m:     ["[1;31msushi[m", "uniswapv2", "v2router"],
[35mconfig/protocols.ts[m[36m:[m[32m11[m[36m:[m  [1;31mpancake[m:   ["[1;31mpancake[m", "[1;31mpancake[mswap", "smartrouter", "universalrouter"],
[35mconfig/protocols.ts[m[36m:[m[32m14[m[36m:[m  [1;31mlimitless[m: ["[1;31mlimitless[m"],
[35mconfig/protocols.ts[m[36m:[m[32m27[m[36m:[m  [1;31msushi[m: [
[35mconfig/protocols.ts[m[36m:[m[32m31[m[36m:[m  [1;31mpancake[m: [
[35mconfig/protocols.ts[m[36m:[m[32m60[m[36m:[m  [1;31mlimitless[m: [
[35mcount_swaps_base.py[m[36m:[m[32m17[m[36m:[m    "[1;31msushi[m": [
[35mcount_swaps_base.py[m[36m:[m[32m20[m[36m:[m    "[1;31mpancake[m": [
[35mcount_swaps_base.py[m[36m:[m[32m46[m[36m:[m    "[1;31mlimitless[m": [
[35mscripts/discover-protocols.ts[m[36m:[m[32m15[m[36m:[m  | "[1;31msushi[m"
[35mscripts/discover-protocols.ts[m[36m:[m[32m16[m[36m:[m  | "[1;31mpancake[m"
[35mscripts/discover-protocols.ts[m[36m:[m[32m19[m[36m:[m  | "[1;31mlimitless[m"
[35mscripts/discover-protocols.ts[m[36m:[m[32m26[m[36m:[m  [1;31msushi[m: ["[1;31msushi[m"],
[35mscripts/discover-protocols.ts[m[36m:[m[32m27[m[36m:[m  [1;31mpancake[m: ["[1;31mpancake[m"],
[35mscripts/discover-protocols.ts[m[36m:[m[32m30[m[36m:[m  [1;31mlimitless[m: ["[1;31mlimitless[m"],
[35mscripts/discover-protocols.ts[m[36m:[m[32m151[m[36m:[m    [1;31msushi[m: [],
[35mscripts/discover-protocols.ts[m[36m:[m[32m152[m[36m:[m    [1;31mpancake[m: [],
[35mscripts/discover-protocols.ts[m[36m:[m[32m155[m[36m:[m    [1;31mlimitless[m: [],
[35mscripts/discover-protocols.ts[m[36m:[m[32m191[m[36m:[m  | "uniswap" | "[1;31msushi[m" | "[1;31mpancake[m" | "aerodrome"
[35mscripts/discover-protocols.ts[m[36m:[m[32m192[m[36m:[m  | "aave" | "[1;31mlimitless[m" | "stargate" | "metamask" | "matcha";
