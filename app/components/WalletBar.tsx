// app/components/WalletBar.tsx
"use client";
import { useState } from "react";

type Props = {
  // نقبل دالة sync أو async
  onCheck: (addr: string) => void | Promise<void>;
  // حالة التحميل (اختياري)
  loading?: boolean;
};

export default function WalletBar({ onCheck, loading = false }: Props) {
  const [input, setInput] = useState("");

  const submit = async () => {
    if (!input.trim()) return;
    await onCheck(input.trim());
  };

  return (
    <div className="mb-6 flex items-center gap-3">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter Base address or basename"
        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none"
        disabled={loading}
      />
      <button
        onClick={submit}
        disabled={loading}
        className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {loading ? "Checking…" : "Check"}
      </button>
    </div>
  );
}
