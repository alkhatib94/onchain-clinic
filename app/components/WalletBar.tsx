// app/components/WalletBar.tsx
"use client";

import { useMemo, useState } from "react";

type Props = {
  onCheck: (addr: string) => void;
  loading?: boolean;
};

const isLikelyAddrOrBasename = (x: string) =>
  /^0x[0-9a-fA-F]{40}$/.test(x) || /\.base\.eth$/i.test(x);

export default function WalletBar({ onCheck, loading = false }: Props) {
  const [addr, setAddr] = useState("");

  const clean = addr.trim();
  const isValid = useMemo(() => {
    if (!clean) return false;
    return isLikelyAddrOrBasename(clean);
  }, [clean]);

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    // امنع الاستدعاء لو الإدخال غير صالح
    if (!isValid) return;
    onCheck(clean);
  };

  return (
    <form onSubmit={submit} className="mb-6 flex items-center gap-3 w-full">
      <input
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        placeholder="0x... or name.base.eth"
        autoComplete="off"
        spellCheck={false}
        className={[
          "flex-1 px-4 py-3 rounded-xl bg-white/5 border outline-none",
          isValid || !clean
            ? "border-white/10 focus:border-white/20"
            : "border-rose-400/50 focus:border-rose-400/70",
        ].join(" ")}
        aria-invalid={!isValid && !!clean}
        aria-describedby="addr-help"
      />
      <button
        type="submit"
        disabled={loading || !isValid}
        className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Checking..." : "Check"}
      </button>
      {/* هنت صغير */}
      {!isValid && !!clean && (
        <span id="addr-help" className="text-xs text-rose-300">
          Enter a valid 0x… address or name.base.eth
        </span>
      )}
    </form>
  );
}
