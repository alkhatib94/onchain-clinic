// app/components/WalletBar.tsx
"use client";

import { useState } from "react";

type Props = {
  onCheck: (addr: string) => void;
  loading?: boolean;
};

export default function WalletBar({ onCheck, loading = false }: Props) {
  const [addr, setAddr] = useState("");

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();          // يمنع التنقل
    if (loading) return;                // لا ترسل طلب جديد أثناء التحميل
    onCheck(addr.trim());
  };

  return (
    <form onSubmit={submit} className="mb-6 flex items-center gap-3">
      <input
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        placeholder="0x... or name.base.eth"
        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none"
      />
      <button
        type="submit"                    // يكفي وحده — لا onClick
        disabled={loading}
        className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "Checking..." : "Check"}
      </button>
    </form>
  );
}
