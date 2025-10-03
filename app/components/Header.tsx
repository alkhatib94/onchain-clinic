import Image from "next/image";

export default function Header() {
  return (
    <header className="flex items-center gap-6 mb-8">
      {/* اللوغو */}
      <div className="flex-shrink-0">
        <Image
          src="/logo.png" // لازم يكون عندك بملف public/logo.png
          alt="OnChain Clinic Logo"
          width={200}
          height={100}
          className="rounded-xl shadow-lg"
        />
      </div>

      {/* النصوص */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold text-white">OnChain Clinic</h1>
        <p className="text-gray-300 text-base max-w-3xl leading-relaxed">
          Onchain Clinic is your trusted health check for wallets on the Base Blockchain —
          built to diagnose your wallet’s health, deliver deep insights, and transform
          complex transactions into clear, actionable analytics.
        </p>
        <p className="text-gray-400 text-sm mt-2 italic">
          Onchain Clinic — The health report for your wallet on Base
        </p>
      </div>
    </header>
  );
}
