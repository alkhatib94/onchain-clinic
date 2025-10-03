// app/components/DoctorSummary.tsx
"use client";

type Level = "Critical" | "Weak" | "Fair" | "Healthy" | "Elite";

type Props = {
  score: number;                         // 0..100
  level: Level;                          // تصنيف الصحة النهائي
  strongest: string;                     // اسم المجال الأقوى (مثال: "Gas", "Diversity", "Swaps")
  weakest: string;                       // اسم المجال الأضعف
};

export default function DoctorSummary({ score, level, strongest, weakest }: Props) {
  const accent = levelAccent(level);

  // 1) رسالة موجزة حسب المستوى
  const headline = levelHeadline(level);

  // 2) نصائح عامة حسب المستوى
  const levelTips = tipsByLevel(level);

  // 3) نصائح ذكية من نقطة الضعف/القوة
  const strengthTips = tipsFromArea(strongest, "strong");
  const weaknessTips = tipsFromArea(weakest, "weak");

  // دمج وتقليم التكرار وإنتاج حزمة قصيرة واضحة
  const unique = dedupe([...weaknessTips, ...levelTips, ...strengthTips]).slice(0, 5);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="text-lg font-semibold">Doctor’s Summary</div>
        <div
          className={[
            "px-3 py-1 rounded-lg text-sm font-medium border",
            accent.badgeBg,
            accent.badgeText,
            accent.badgeBorder,
          ].join(" ")}
          title={`Wallet Health: ${level}`}
        >
          {level} · {score}/100
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 text-sm">
        {/* Headline */}
        <p className="opacity-90">{headline}</p>

        {/* Strength / Weakness chips */}
        <div className="flex flex-wrap gap-2">
          <Chip label={`Strongest: ${cap(strongest || "—")}`} intent="good" />
          <Chip label={`Needs attention: ${cap(weakest || "—")}`} intent="warn" />
        </div>

        {/* Actionable advice */}
        <div>
          <div className="text-[13px] font-semibold mb-2 opacity-90">Focus for this week</div>
          <ul className="list-disc pl-5 space-y-1 opacity-90">
            {unique.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- UI bits ---------- */

function Chip({ label, intent }: { label: string; intent: "good" | "warn" }) {
  const cls =
    intent === "good"
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
      : "bg-rose-500/15 text-rose-300 border border-rose-500/30";
  return (
    <span className={`text-xs px-2.5 py-1 rounded-md ${cls}`}>
      {label}
    </span>
  );
}

/* ---------- Logic helpers ---------- */

function levelAccent(level: Level) {
  switch (level) {
    case "Elite":
      return {
        badgeBg: "bg-emerald-500/15",
        badgeText: "text-emerald-300",
        badgeBorder: "border-emerald-500/30",
      };
    case "Healthy":
      return {
        badgeBg: "bg-teal-500/15",
        badgeText: "text-teal-300",
        badgeBorder: "border-teal-500/30",
      };
    case "Fair":
      return {
        badgeBg: "bg-yellow-500/15",
        badgeText: "text-yellow-200",
        badgeBorder: "border-yellow-500/30",
      };
    case "Weak":
      return {
        badgeBg: "bg-orange-500/15",
        badgeText: "text-orange-200",
        badgeBorder: "border-orange-500/30",
      };
    case "Critical":
    default:
      return {
        badgeBg: "bg-rose-500/15",
        badgeText: "text-rose-200",
        badgeBorder: "border-rose-500/30",
      };
  }
}

function levelHeadline(level: Level) {
  switch (level) {
    case "Elite":
      return "Outstanding onchain fitness. Keep your strategy diversified and keep an eye on gas spikes during peak activity.";
    case "Healthy":
      return "Great performance. Maintain balanced protocol usage and continue optimizing gas and approvals.";
    case "Fair":
      return "Stable but improvable. Increase consistent onchain days, reduce redundant approvals, and grow diversity progressively.";
    case "Weak":
      return "Under observation — build rhythm first. Add safe interactions, increase unique days, and prefer audited protocols.";
    case "Critical":
    default:
      return "Your wallet needs immediate attention. Start with low-risk, reputable protocols and gradually increase activity.";
  }
}

function tipsByLevel(level: Level): string[] {
  switch (level) {
    case "Elite":
      return [
        "Set weekly caps for gas spend; review cost outliers.",
        "Consolidate small token dust to reduce portfolio noise.",
        "Rotate through a few trusted protocols to keep diversity without overexposure.",
      ];
    case "Healthy":
      return [
        "Batch actions where possible to cut gas overhead.",
        "Revisit token approvals and revoke stale ones.",
        "Maintain 2–3 sessions/week of activity to keep streaks healthy.",
      ];
    case "Fair":
      return [
        "Target 3–5 active days this week.",
        "Add one reputable lending/DEX protocol to increase diversity safely.",
        "Monitor largest swaps; split orders to manage slippage.",
      ];
    case "Weak":
      return [
        "Start with 2–3 simple swaps of stable pairs.",
        "Interact with one audited protocol and track gas per tx.",
        "Avoid high-slippage pairs; use routers with good quotes.",
      ];
    case "Critical":
    default:
      return [
        "Begin with small-value, low-risk transactions to verify flows.",
        "Use known bridges/DEXes; avoid unknown contracts.",
        "Enable notifications for approvals and consider revoking old ones.",
      ];
  }
}

function tipsFromArea(area: string, kind: "strong" | "weak"): string[] {
  const s = (area || "").toLowerCase();
  // مفاتيح شائعة: swaps, gas, diversity, lending, bridges, nfts, volume, activity
  if (includesAny(s, ["gas", "fee"])) {
    return kind === "weak"
      ? ["Use batching or routers that optimize gas.", "Stick to off-peak times to lower base fees."]
      : ["Keep logging gas/tx; aim for sub-median costs.", "Share gas learnings across protocols you use."];
  }
  if (includesAny(s, ["swap", "dex", "uniswap", "aerodrome", "matcha", "pancake", "sushi"])) {
    return kind === "weak"
      ? ["Start with blue-chip pairs (ETH/USDC) to stabilize execution.", "Compare quotes across 2 routers before confirming."]
      : ["Leverage limit orders or RFQ when available.", "Document best routes to reuse for similar trades."];
  }
  if (includesAny(s, ["lending", "aave", "borrow", "repay"])) {
    return kind === "weak"
      ? ["Begin with small supply positions only; avoid leverage first.", "Track health factor and set alerts for volatility."]
      : ["Periodically rebalance collateral to reduce liquidation risk.", "Use isolated pools for risk control where possible."];
  }
  if (includesAny(s, ["diversity", "contracts", "unique", "variety"])) {
    return kind === "weak"
      ? ["Add 1 new reputable protocol this week to grow diversity safely.", "Review contract creators; avoid unlabeled or new code."]
      : ["Maintain diverse interactions but trim redundant tools.", "Favor protocols with public audits and battle-tested code."];
  }
  if (includesAny(s, ["bridge", "referral", "across", "jumper", "relay", "bungee", "stargate"])) {
    return kind === "weak"
      ? ["Prefer native or well-audited bridges; test with small amounts first.", "Double-check target chain addresses before sending."]
      : ["Keep a checklist for cross-chain moves to avoid mistakes.", "Track bridge fees and choose off-peak windows."];
  }
  if (includesAny(s, ["nft", "imaging", "collectible"])) {
    return kind === "weak"
      ? ["Use trusted marketplaces; watch approval scopes.", "Avoid minting during gas spikes; verify contract metadata."]
      : ["Batch listing/transfer operations when possible.", "Use cold storage for long-term holds."];
  }
  if (includesAny(s, ["volume", "dosage", "eth", "size"])) {
    return kind === "weak"
      ? ["Keep transaction sizes modest until metrics improve.", "Split large orders to reduce slippage and MEV risk."]
      : ["Use MEV-protected RPC when doing larger trades.", "Pre-set slippage and simulate before sending."];
  }
  if (includesAny(s, ["activity", "days", "streak", "frequency"])) {
    return kind === "weak"
      ? ["Target a simple 3-day streak this week.", "Schedule small recurring actions to build rhythm."]
      : ["Maintain a steady cadence; avoid unnecessary bursts.", "Back up your flow with notes/alerts."];
  }
  // fallback نصائح عامة
  return kind === "weak"
    ? ["Start small on a reputable protocol and measure gas & slippage.", "Avoid new or unlabeled contracts until score improves."]
    : ["Keep your rhythm; review approvals monthly.", "Document what works and reuse winning patterns."];
}

function includesAny(s: string, keys: string[]) {
  return keys.some((k) => s.includes(k));
}

function dedupe(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of arr) {
    if (!a) continue;
    const key = a.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(a);
    }
  }
  return out;
}

const cap = (s: string) => (s || "—").replace(/^\s*(\w)/, (m) => m.toUpperCase());
