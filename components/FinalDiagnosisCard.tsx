// app/components/FinalDiagnosisCard.tsx
"use client";

import { useMemo, useState } from "react";

type Level = "Critical" | "Weak" | "Fair" | "Healthy" | "Elite";

type Props = {
  score: number;
  level: Level;
  emoji?: string;
  /** ممكن تيجي من computeHealth كمصفوفة، أو نص واحد */
  strongest?: string[] | string;
  weakest?: string[] | string;
  onMint?: () => Promise<void> | void;
};

const toneByLevel: Record<Level, string> = {
  Critical: "from-rose-500 to-rose-300",
  Weak:     "from-orange-500 to-amber-300",
  Fair:     "from-yellow-500 to-yellow-300",
  Healthy:  "from-emerald-500 to-teal-300",
  Elite:    "from-violet-500 to-fuchsia-300",
};

export default function FinalDiagnosisCard({
  score,
  level,
  emoji = "🩺",
  strongest = [],
  weakest = [],
  onMint,
}: Props) {
  const [minted, setMinted] = useState(false);

  // طَبِّع strongest/weakest إلى مصفوفات آمنة دائمًا
  const strong: string[] = useMemo(() => (
    Array.isArray(strongest)
      ? strongest.filter(Boolean)
      : strongest ? [strongest] : []
  ), [strongest]);

  const weak: string[] = useMemo(() => (
    Array.isArray(weakest)
      ? weakest.filter(Boolean)
      : weakest ? [weakest] : []
  ), [weakest]);

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
    const sStrong = strong.slice(0, 3).map(titleize).join(", ") || "—";
    const sWeak = weak.slice(0, 3).map(titleize).join(", ") || "—";
    const txt = encodeURIComponent(
      `My Onchain Clinic diagnosis: ${score}/100 — ${level} ${emoji}\nStrongest: ${sStrong} | Needs work: ${sWeak}\n#Base #OnchainClinic`
    );
    const url = `https://twitter.com/intent/tweet?text=${txt}`;
    window.open(url, "_blank");
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden h-full flex flex-col">
      {/* header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="text-lg font-semibold">Final Diagnosis</div>
        <div className={`px-3 py-1 rounded-md text-sm bg-gradient-to-r ${color}`}>
          {emoji} {level}
        </div>
      </div>

      {/* body */}
      <div className="p-5 grid md:grid-cols-3 gap-5 items-center flex-1">
        {/* Gauge */}
        <div className="flex items-center justify-center">
          <ScoreGauge score={score} levelColor={color} />
        </div>

        {/* Facts */}
        <div className="md:col-span-2 space-y-3">
          <div className="text-[15px]">
            Your wallet’s overall health is{" "}
            <span className={`font-semibold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
              {level}
            </span>{" "}
            with a score of <span className="font-semibold">{score}/100</span>.
          </div>

          {/* قوائم آمنة */}
          {!!strong.length && (
            <div className="text-sm opacity-80">
              <b>Strongest:</b>{" "}
              {strong.slice(0, 6).map((x, i) => (
                <span key={i}>
                  {titleize(x)}
                  {i < Math.min(strong.length, 6) - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

          {!!weak.length && (
            <div className="text-sm opacity-80">
              <b>Needs attention:</b>{" "}
              {weak.slice(0, 6).map((x, i) => (
                <span key={i}>
                  {titleize(x)}
                  {i < Math.min(weak.length, 6) - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

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
              className={`px-4 py-2 rounded-xl border border-white/10 ${
                minted
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90"
                  : "bg-white/5 opacity-60 cursor-not-allowed"
              }`}
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
  if (!s) return "";
  return s.replace(/(^\w)|([-_\s]\w)/g, (m) => m.slice(-1).toUpperCase());
}

function ScoreGauge({ score, levelColor }: { score: number; levelColor: string }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 64;
  const semiLen = Math.PI * radius;
  const dash = (pct / 100) * semiLen;

  return (
    <svg width="180" height="110" viewBox="0 0 180 110" className="overflow-visible">
      {/* track */}
      <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" strokeLinecap="round" />
      {/* bar (نستخدم currentColor + div خارجي للّون) */}
      <g className={`text-transparent bg-clip-text ${"bg-gradient-to-r " + levelColor}`}>
        <path
          d="M20 90 A70 70 0 0 1 160 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${semiLen - dash}`}
        />
      </g>
      {/* labels */}
      <text x="90" y="88" textAnchor="middle" fontSize="18" fontWeight="700" fill="white">{pct}</text>
      <text x="90" y="105" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.7)">/ 100</text>
    </svg>
  );
}
