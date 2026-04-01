"use client";
// UpgradeModal.tsx — shown when daily limit is reached or a gated feature is accessed

import { X, Zap, ShieldCheck, Layers, Table2, Presentation } from "lucide-react";

export type UpgradeReason = "conversion_limit" | "tool_limit" | "batch" | "ocr" | "format" | "feature";

interface UpgradeModalProps {
  onClose: () => void;
  reason?: UpgradeReason;
}

const REASON_COPY: Record<UpgradeReason, { title: string; sub: string }> = {
  conversion_limit: {
    title: "You've used your 3 free conversions today",
    sub: "Upgrade to unlock unlimited conversions, AI OCR, Excel & PowerPoint export.",
  },
  tool_limit: {
    title: "You've used your 3 free tool uses today",
    sub: "Upgrade to unlock unlimited PDF tool uses — merge, split, compress & unlock.",
  },
  batch: {
    title: "Batch conversion is a paid feature",
    sub: "Convert multiple PDFs at once with any paid plan.",
  },
  ocr: {
    title: "AI OCR requires a paid plan",
    sub: "Upgrade to unlock AI OCR for scanned & handwritten PDFs.",
  },
  format: {
    title: "Excel & PowerPoint export requires a paid plan",
    sub: "Upgrade to export PDF to Excel (.xlsx) or PowerPoint (.pptx).",
  },
  feature: {
    title: "This feature requires a paid plan",
    sub: "Upgrade to Individual, Pro, or Legal to unlock all features.",
  },
};

const FEATURES = [
  { icon: <Zap size={14} />,          text: "Unlimited conversions every day" },
  { icon: <Table2 size={14} />,       text: "Export to Excel (.xlsx)" },
  { icon: <Presentation size={14} />, text: "Export to PowerPoint (.pptx)" },
  { icon: <Layers size={14} />,       text: "Batch convert multiple PDFs at once" },
  { icon: <ShieldCheck size={14} />,  text: "Files still never leave your device" },
];

// Variant IDs come from env vars — set these in your Vercel dashboard:
//   NEXT_PUBLIC_LS_VARIANT_INDIVIDUAL   (individual plan variant ID)
//   NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY  (pro monthly variant ID)
//   NEXT_PUBLIC_LS_VARIANT_LEGAL        (legal plan variant ID)
//
// checkout[custom][plan] embeds the tier in the checkout session so the
// LemonSqueezy webhook (/api/webhooks/lemonsqueezy) can read it server-side.
// LemonSqueezy will append ?order_id=... to success_url after purchase.
const SUCCESS_BASE = typeof window !== "undefined"
  ? `${window.location.origin}/success`
  : `${process.env.NEXT_PUBLIC_URL ?? "https://privapdf.net"}/success`;

const LS_SLUG = process.env.NEXT_PUBLIC_LS_STORE_SLUG ?? "privapdf";

const mkLSUrl = (variantId: string, plan: string) =>
  `https://${LS_SLUG}.lemonsqueezy.com/checkout/buy/${variantId}` +
  `?checkout[success_url]=${encodeURIComponent(SUCCESS_BASE + "?plan=" + plan)}` +
  `&checkout[cancel_url]=${encodeURIComponent(SUCCESS_BASE.replace("/success", "/#pricing"))}` +
  `&checkout[custom][plan]=${encodeURIComponent(plan)}`;

const PLANS = [
  {
    id: "individual",
    label: "Individual",
    price: "$19",
    sub: "one-time · yours forever",
    highlight: true,
    cta: "Buy once — $19",
    href: mkLSUrl(process.env.NEXT_PUBLIC_LS_VARIANT_INDIVIDUAL ?? "", "individual"),
  },
  {
    id: "pro",
    label: "Pro",
    price: "$9",
    sub: "/mo · or $99/yr",
    highlight: false,
    cta: "Start Pro",
    href: mkLSUrl(process.env.NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY ?? "", "pro"),
  },
  {
    id: "legal",
    label: "Legal",
    price: "$29",
    sub: "/mo · redaction + OCR",
    highlight: false,
    cta: "Start Legal",
    href: mkLSUrl(process.env.NEXT_PUBLIC_LS_VARIANT_LEGAL ?? "", "legal"),
  },
] as const;

export function UpgradeModal({ onClose, reason = "conversion_limit" }: UpgradeModalProps) {
  const copy = REASON_COPY[reason];

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
          background: "rgba(15,14,13,0.72)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "relative",
        width: "100%", maxWidth: 480,
        background: "var(--paper)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "0 24px 56px rgba(0,0,0,0.14)",
        padding: "36px 36px 28px",
        display: "flex", flexDirection: "column", gap: 22,
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
            width: 52, height: 52, borderRadius: 14,
            background: "var(--accent-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <Zap size={24} color="var(--accent)" />
          </div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 6, color: "var(--ink)" }}>
            {copy.title}
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
            {copy.sub}
          </p>
        </div>

        {/* What you unlock */}
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", background: "var(--cream)", borderRadius: 12, border: "1px solid var(--border)" }}>
          {FEATURES.map((f, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--ink)" }}>
              <span style={{ color: "var(--accent)", flexShrink: 0 }}>{f.icon}</span>
              {f.text}
            </li>
          ))}
        </ul>

        {/* Plan cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PLANS.map((plan) => (
            <a
              key={plan.id}
              href={plan.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px", borderRadius: 12, textDecoration: "none",
                border: plan.highlight ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                background: plan.highlight ? "var(--ink)" : "var(--paper)",
                transition: "opacity 0.15s",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: plan.highlight ? "#fff" : "var(--ink)", marginBottom: 2 }}>
                  {plan.label}
                  {plan.id === "individual" && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", background: "var(--accent)", color: "#fff", padding: "2px 8px", borderRadius: 20 }}>
                      Best value
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: plan.highlight ? "#8db89a" : "var(--muted)" }}>{plan.sub}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 20, color: plan.highlight ? "#fff" : "var(--ink)" }}>
                  {plan.price}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8,
                  background: plan.highlight ? "var(--accent)" : "var(--cream)",
                  color: plan.highlight ? "#fff" : "var(--ink)",
                  border: plan.highlight ? "none" : "1px solid var(--border)",
                }}>
                  {plan.cta}
                </span>
              </div>
            </a>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: -8 }}>
          Secure checkout · 14-day refund policy · Files always stay on your device
        </p>
      </div>
    </div>
  );
}
