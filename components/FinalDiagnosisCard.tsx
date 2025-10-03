// app/components/FinalDiagnosisCard.tsx
"use client";
import { useState } from "react";

type Props = {
  score: number;
  level: "Critical"|"Weak"|"Fair"|"Healthy"|"Elite";
  emoji: string;
  strongest: string;
  weakest: string;
  onMint?: () => Promise<void> | void;
};

const toneByLevel: Record<Props["level"], string> = {
  Critical: "from-rose-500 to-rose-300",
  Weak:     "from-orange-500 to-amber-300",
  Fair:     "from-yellow-500 to-yellow-300",
  Healthy:  "from-emerald-500 to-teal-300",
  Elite:    "from-violet-500 to-fuchsia-300",
};

export default function FinalDiagnosisCard({ score, level, emoji, strongest, weakest, onMint }: Props) {
  const [minted, setMinted] = useState(false);
  const color = toneByLevel[level];

  const handleMint = async () => {
    try {
      if (onMint) await onMint();
      setMinted(true);
    } catch (e) {
      console.error(e);
      alert("Mint failed. Try again.");
    }
  };

  const shareX = () => {
    const txt = encodeURIComponent(
      `My Onchain Clinic diagnosis: ${score}/100 — ${level} ${emoji}\nStrongest: ${titleize(strongest)} | Needs work: ${titleize(weakest)}\n#Base #OnchainClinic`
    );
    const url = `https://twitter.com/intent/tweet?text=${txt}`;
    window.open(url, "_blank");
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
      {/* header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="text-lg font-semibold">Final Diagnosis</div>
        <div className={`px-3 py-1 rounded-md text-sm bg-gradient-to-r ${color}`}>
          {emoji} {level}
        </div>
      </div>

      {/* body */}
      <div className="p-5 grid md:grid-cols-3 gap-5 items-center">
        {/* Gauge */}
        <div className="flex items-center justify-center">
          <ScoreGauge score={score} levelColor={color} />
        </div>

        {/* Facts */}
        <div className="md:col-span-2 space-y-3">
          <div className="text-[15px]">
            Your wallet’s overall health is
            {" "}
            <span className={`font-semibold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
              {level}
            </span>
            {" "}
            with a score of
            {" "}
            <span className="font-semibold">{score}/100</span>.
          </div>
          <div className="text-sm opacity-80">
            <b>Strongest area:</b> {titleize(strongest)} • <b>Needs attention:</b> {titleize(weakest)}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleMint}
              className="px-4 py-2 rounded-xl border border-white/10 bg-gradient-to-r from-sky-500 to-indigo-400 hover:opacity-90"
            >
              🖼️ Mint Onchain Report (Base)
            </button>
            <button
              onClick={shareX}
              disabled={!minted}
              className={`px-4 py-2 rounded-xl border border-white/10 ${minted ? "bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90" : "bg-white/5 opacity-60 cursor-not-allowed"}`}
              title={minted ? "Share your minted report" : "Mint first to enable sharing"}
            >
              ✨ Share on X (Twitter)
            </button>
          </div>

          {!minted && (
            <div className="text-xs opacity-60">
              * Sharing is enabled after you mint the report to prove authenticity.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function titleize(s: string) {
  return s.replace(/^\w/, (m)=> m.toUpperCase());
}

function ScoreGauge({ score, levelColor }: { score: number; levelColor: string }) {
  // SVG semicircle 0..100
  const pct = Math.max(0, Math.min(100, score));
  const radius = 64;
  const circ = Math.PI * radius; // semicircle length
  const dash = (pct/100) * circ;

  return (
    <svg width="180" height="110" viewBox="0 0 180 110" className="overflow-visible">
      {/* track */}
      <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" strokeLinecap="round"/>
      {/* bar */}
      <path
        d="M20 90 A70 70 0 0 1 160 90"
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        className={`stroke-[url(#grad)]`}
        strokeDasharray={`${dash} ${circ - dash}`}
      />
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          {/* levelColor is "from-x to-y" Tailwind; we mimic with two stops */}
          <stop offset="0%" stopColor="currentColor" />
        </linearGradient>
      </defs>
      {/* color mask via gradient class on container */}
      <g className={`text-transparent bg-clip-text ${"bg-gradient-to-r "+levelColor}`}>
        <text x="90" y="88" textAnchor="middle" fontSize="18" fontWeight="700" fill="white">{score}</text>
        <text x="90" y="105" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.7)">/ 100</text>
      </g>
    </svg>
  );
}
