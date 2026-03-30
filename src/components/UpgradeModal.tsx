"use client";
// UpgradeModal.tsx — shown when daily limit is reached

import { X, Zap, Lock, Infinity } from "lucide-react";

interface UpgradeModalProps {
  onClose: () => void;
}

const FEATURES = [
  { icon: <Infinity className="w-4 h-4" />, text: "Unlimited conversions every day" },
  { icon: <Zap className="w-4 h-4" />, text: "Priority processing (no queue)" },
  { icon: <Lock className="w-4 h-4" />, text: "File still never leaves your device" },
];

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const handleOneTime = () => {
    // Replace with your actual Stripe payment link
    window.open("https://buy.stripe.com/your_link_here", "_blank");
  };

  const handleMonthly = () => {
    // Replace with your actual Stripe subscription link
    window.open("https://buy.stripe.com/your_subscription_link_here", "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-[#0f1117] border border-white/10 shadow-2xl p-8 space-y-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center mx-auto">
            <Zap className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">You&apos;ve used your 3 free conversions today</h2>
          <p className="text-white/50 text-sm">Upgrade to convert unlimited PDFs.</p>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {FEATURES.map((f, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-white/70">
              <span className="text-green-400">{f.icon}</span>
              {f.text}
            </li>
          ))}
        </ul>

        {/* Pricing options */}
        <div className="space-y-3">
          <button
            onClick={handleOneTime}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
          >
            Unlock Forever — $19 one-time
          </button>
          <button
            onClick={handleMonthly}
            className="w-full py-3.5 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 font-medium transition-all duration-200"
          >
            Subscribe — $5/month
          </button>
        </div>

        <p className="text-center text-xs text-white/30">
          Secure payment via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
