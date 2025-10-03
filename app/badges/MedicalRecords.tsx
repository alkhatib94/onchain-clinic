"use client";

import { FaFileMedical } from "react-icons/fa";

type Props = {
  /** يUnlock البادج الأساسية إذا كان للمحفظة اسم .base.eth */
  baseEns: string | null;

  /** اختياري: عدد POAPs */
  poapCount?: number;

  /** اختياري: عدد NFTs تُعدّ هوية/ID (هنعمل اكتشاف لاحقاً) */
  identityNfts?: number;

  /** اختياري: هل عنده Proof of Humanity أو ما شابه */
  hasProofOfHumanity?: boolean;

  /** اختياري: هل عنده Gitcoin Passport */
  hasGitcoinPassport?: boolean;

  /** اختياري: هل معيّن صورة بروفايل (PFP) مضبوطة */
  hasPrimaryPfp?: boolean;
};

export default function MedicalRecords({
  baseEns,
  poapCount = 0,
  identityNfts = 0,
  hasProofOfHumanity = false,
  hasGitcoinPassport = false,
  hasPrimaryPfp = false,
}: Props) {
  const items = [
    {
      name: "Onchain Identity",
      desc: "Owns a .base.eth",
      unlocked: !!baseEns,
    },
    {
      name: "POAP Patient",
      desc: "Holds at least 1 POAP",
      unlocked: poapCount >= 1,
    },
    {
      name: "NFT ID Card",
      desc: "Holds an identity/ID NFT",
      unlocked: identityNfts >= 1,
    },
    {
      name: "Proof of Humanity",
      desc: "Verified via PoH or similar",
      unlocked: !!hasProofOfHumanity,
    },
    {
      name: "Gitcoin Passport",
      desc: "Has Gitcoin Passport",
      unlocked: !!hasGitcoinPassport,
    },
    {
      name: "Profile Picture",
      desc: "Primary avatar (PFP) is set",
      unlocked: !!hasPrimaryPfp,
    },
  ];

  const done = items.filter((i) => i.unlocked).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20 h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/5 border border-white/10">
            <FaFileMedical className="text-slate-300" />
          </span>
          <div className="font-semibold">Medical Records</div>
        </div>
        <div className="text-xs text-white/60">
          {done}/{items.length} unlocked ({pct}%)
        </div>
      </div>

      {/* List */}
      <div className="p-5 flex-1">
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-3 py-3 rounded-xl border border-white/10"
            >
              <div
                className={`w-7 h-7 rounded-md border flex items-center justify-center text-xs ${
                  it.unlocked
                    ? "border-emerald-500/60 text-emerald-400"
                    : "border-white/15 text-white/40"
                }`}
                title={it.unlocked ? "Unlocked" : "Locked"}
              >
                {i + 1}
              </div>

              <div className="flex-1">
                <div className="text-sm font-semibold">{it.name}</div>
                <div className="text-xs opacity-70">{it.desc}</div>
                {/* ملاحظة صغيرة تحت أول عنصر لعرض الاسم إن وجد */}
                {i === 0 && baseEns && (
                  <div className="text-[11px] opacity-70 mt-1">Name: {baseEns}</div>
                )}
              </div>

              <div
                className={`text-xs ${
                  it.unlocked ? "text-emerald-400" : "text-white/40"
                }`}
              >
                {it.unlocked ? "Unlocked" : "—"}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Progress */}
      <div className="px-5 pb-4">
        <div className="text-xs mb-1 opacity-70">Progress</div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
