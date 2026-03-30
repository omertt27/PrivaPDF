"use client";
// UpgradeModal.tsx — shown when daily limit is reached

import { X, Zap, ShieldCheck, Layers, Table2, FileText } from "lucide-react";

interface UpgradeModalProps {
  onClose: () => void;
}

const FEATURES = [
  { icon: <Zap size={15} />,         text: "Unlimited conversions every day" },
  { icon: <Table2 size={15} />,      text: "Export to Excel (.xlsx)" },
  { icon: <Layers size={15} />,      text: "Batch convert multiple PDFs at once" },
  { icon: <FileText size={15} />,    text: "Plain text & early access to new formats" },
  { icon: <ShieldCheck size={15} />, text: "Files still never leave your device" },
];

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const handleOneTime = () => {
    window.open("https://buy.stripe.com/your_link_here", "_blank");
  };

  const handleMonthly = () => {
    window.open("https://buy.stripe.com/your_subscription_link_here", "_blank");
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(15,14,13,0.7)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "relative",
        width: "100%", maxWidth: 440,
        background: "var(--paper)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
        padding: 36,
        display: "flex", flexDirection: "column", gap: 24,
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none",
            cursor: "pointer", padding: 6, borderRadius: 8,
            color: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "var(--accent-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Zap size={26} color="var(--accent)" />
          </div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 24, marginBottom: 8, color: "var(--ink)" }}>
            You&apos;ve used your 3 free conversions today
          </h2>
          <p style={{ fontSize: 14, color: "var(--muted)" }}>
            Upgrade once. Convert unlimited PDFs — forever.
          </p>
        </div>

        {/* Features */}
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {FEATURES.map((f, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ink)" }}>
              <span style={{ color: "var(--accent)", flexShrink: 0 }}>{f.icon}</span>
              {f.text}
            </li>
          ))}
        </ul>

        {/* Pricing */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleOneTime}
            style={{
              width: "100%", padding: "14px 20px",
              borderRadius: 10, border: "none",
              background: "var(--ink)", color: "var(--paper)",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--sans)",
            }}
          >
            Unlock Forever — $19 one-time
          </button>
          <button
            onClick={handleMonthly}
            style={{
              width: "100%", padding: "13px 20px",
              borderRadius: 10,
              border: "1.5px solid var(--border)",
              background: "var(--cream)", color: "var(--ink)",
              fontSize: 14, fontWeight: 500, cursor: "pointer",
              fontFamily: "var(--sans)",
            }}
          >
            Subscribe — $5/month · cancel anytime
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
          Secure payment via Stripe · Your files still never leave your device.
        </p>
      </div>
    </div>
  );
}
