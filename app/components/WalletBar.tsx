"use client";
import { useState } from "react";

export default function WalletBar({ onCheck }: { onCheck: (addr: string) => void }) {
  const [input, setInput] = useState("");

  return (
    <div className="flex justify-center mt-6 mb-10 md:mb-12">
      <div className="flex w-full max-w-2xl gap-3">
        <input
          type="text"
          placeholder="Enter wallet address or Base name"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => onCheck(input)}
          className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
        >
          Check
        </button>
      </div>
    </div>
  );
}
