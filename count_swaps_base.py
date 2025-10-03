import os
import time
import requests
from datetime import datetime, timezone

BASESCAN_API_KEY = os.getenv("BASESCAN_API_KEY", "PUT_YOUR_KEY_HERE")
WALLET = "0xYourWalletHere"  # <-- عدّلها
CHAIN = "base"
BASESCAN = "https://api.basescan.org/api"

# عناوين routers/aggregators على Base (قابلة للتعديل)
ROUTERS = {
    "uniswap": [
        "0x6ff5693b99212da76ad316178a184ab56d299b43",  # UniversalRouter
        "0x2626664c2603336e57b271c5c0b26f421741e481",  # SwapRouter02
    ],
    "sushi": [
        "0x6bded42c6da8fbf0d2ba55b2fa120c5e0c8d7891",  # V2 Router
    ],
    "pancake": [
        "0x678aa4bf4e210cf2166753e054d5b7c31cc7fa86",  # Smart Router (v3)
        "0xfe6508f0015c778bdcc1fb5465ba5ebe224c9912",  # (router/UR)
    ],
    "aerodrome": [
        "0xbe6d8f0d05cc4be24d5167a3ef062215be6d18a5",  # Slipstream Swap Router
        "0x6cb442acf35158d5eda88fe602221b67b400be3e",  # Router/UR
        "0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43",  # Router قديم/بديل
    ],
    "aave": [
        # ملاحظة: Aave غالبًا مش swaps تقليدية، بس منخليها إن احتجت تتبّع تفاعلات
        "0xa238dd80c259a72e81d7e4664a9801593f98d1c5",  # Pool proxy
    ],
    "stargate": [
        "0x45f1a95a4d3f3836523f5c83673c797f4d4d263b",  # Router
        "0x50b6ebc2103bfec165949cc946d739d5650d7ae4",  # RouterETH
        "0xaf54be5b6eec24d6bfacf1cce4eaf680a8239398",  # Bridge
    ],
    "metamask": [
        # غالبًا يستخدم 0x Exchange Proxy
        "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
    ],
    "matcha": [
        # Matcha مبني على 0x برضه
        "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
    ],
    "limitless": [
        # ضيفها إذا عندك عناوين رسمية
    ],
}

# جميع العناوين بحروف صغيرة للمقارنة
ALL_ROUTER_SET = set(a.lower() for v in ROUTERS.values() for a in v)

# تعريف الـ stablecoins المعروفة على Base (قابلة للتوسعة)
STABLES = {
    # USDC (Native Base)
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913".lower(): "USDC",
    # Bridged USDbC
    "0xd9aaec86b65d86f6a7b5b1b0c42ffa7505e8fe86".lower(): "USDbC",
    # DAI (تحقق من العنوان إذا بتستخدمه)
    # "0x50c...": "DAI",
    # USDT على Base (أضفه لو بتستخدمه)
    # "0x...": "USDT",
}

def basescan_get(params):
    params["apikey"] = BASESCAN_API_KEY
    r = requests.get(BASESCAN, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    if data.get("status") == "0" and data.get("message") != "No transactions found":
        # معنى ذلك خطأ بالطلب
        raise RuntimeError(f"BaseScan error: {data}")
    return data.get("result", [])

def get_normal_txs(address, start_block=0, end_block=99999999):
    # معاملات account to contract (normal)
    params = {
        "module": "account",
        "action": "txlist",
        "address": address,
        "startblock": start_block,
        "endblock": end_block,
        "sort": "asc",
    }
    return basescan_get(params)

def get_erc20_transfers(address, start_block=0, end_block=99999999):
    params = {
        "module": "account",
        "action": "tokentx",
        "address": address,
        "startblock": start_block,
        "endblock": end_block,
        "sort": "asc",
    }
    return basescan_get(params)

def within_window(ts, start_ts=None, end_ts=None):
    if start_ts and ts < start_ts:
        return False
    if end_ts and ts > end_ts:
        return False
    return True

def main():
    # (اختياري) حدّد نافذة زمنية لو التراكر بيحسب من تاريخ معيّن
    # مثال: من 1 سبتمبر 2025
    start_ts = None  # int(datetime(2025,9,1,tzinfo=timezone.utc).timestamp())
    end_ts = None

    print(f"[i] Checking swaps for {WALLET} on Base …")
    normal = get_normal_txs(WALLET)
    erc20 = get_erc20_transfers(WALLET)

    # خرائط سريعة
    # txHash -> هل هو لراوتر؟
    tx_to_router = {}
    for tx in normal:
        to_addr = (tx.get("to") or "").lower()
        if not to_addr:
            continue
        if to_addr in ALL_ROUTER_SET:
            ts = int(tx["timeStamp"])
            if within_window(ts, start_ts, end_ts):
                tx_to_router[tx["hash"]] = {
                    "to": to_addr,
                    "time": ts,
                    "value_wei": int(tx.get("value", "0")),
                    "success": (tx.get("isError") == "0"),
                }

    # الآن نحدد أي من هذه المعاملات فعلاً تضمنت تحويل ERC20 (swap-ish)
    # ونحدّد إذا كانت Stable
    swap_count = 0
    stable_swap_count = 0
    per_proto_counts = {k: 0 for k in ROUTERS.keys()}
    per_proto_stables = {k: 0 for k in ROUTERS.keys()}

    # بناء فهرس سريع للراوتر -> اسم البروتوكول
    router_to_proto = {}
    for proto, addrs in ROUTERS.items():
        for a in addrs:
            router_to_proto[a.lower()] = proto

    # نجمع تحويلات ERC20 المرتبطة بكل txhash
    transfers_by_tx = {}
    for t in erc20:
        h = t["hash"]
        ts = int(t["timeStamp"])
        if not within_window(ts, start_ts, end_ts):
            continue
        transfers_by_tx.setdefault(h, []).append(t)

    for h, meta in tx_to_router.items():
        if not meta["success"]:
            continue
        # إذا فيه تحويلات ERC20 بالمعاملة نعتبرها swap (تقريبًا)
        transfers = transfers_by_tx.get(h, [])
        if not transfers:
            continue
        swap_count += 1
        proto = router_to_proto.get(meta["to"], "unknown")
        if proto in per_proto_counts:
            per_proto_counts[proto] += 1

        # check stable involvement (أي طرف من التحويلات stable يكفي لاعتباره stable swap)
        is_stable = False
        for t in transfers:
            token_addr = (t.get("contractAddress") or "").lower()
            if token_addr in STABLES:
                is_stable = True
                break
        if is_stable:
            stable_swap_count += 1
            if proto in per_proto_stables:
                per_proto_stables[proto] += 1

    print("=== Summary ===")
    print(f"Total swaps via known routers: {swap_count}")
    print(f"Stablecoin-involved swaps:     {stable_swap_count}")
    print("\nBy protocol:")
    for p in ROUTERS:
        print(f"  {p:<12} swaps={per_proto_counts[p]:<4}  stable_swaps={per_proto_stables[p]:<4}")

    if swap_count == 0:
        print("\n[!] ما في ولا سواپ مطابق لقائمة الراوتر. غالبًا:")
        print("    - استخدمت مجمّع أو راوتر غير مضاف (ضف عنوانه لقائمة ROUTERS).")
        print("    - الفترة الزمنية للتراكر مختلفة (حدد start_ts/end_ts).")
        print("    - المعاملة فشلت أو كانت بس approve مش swap.")
        print("    - الحد الأدنى للمبلغ عند التراكر أعلى من مبالغك.")

if __name__ == "__main__":
    main()
