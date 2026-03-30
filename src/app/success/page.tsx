"use client";
// /success — LemonSqueezy redirects here after checkout.
// LemonSqueezy appends ?order_id={ORDER_ID} to the success_url automatically.
// We also embed ?plan=individual|pro|legal in the success_url on each LS checkout link.

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { activatePlan, getPlan, type PlanTier, PLAN_META } from "@/lib/usage-gate";

type PageState = "activating" | "done" | "error";

const PLAN_PERKS: Record<PlanTier, string[]> = {
  free: [],
  individual: [
    "Unlimited conversions — no daily cap",
    "AI OCR for scanned & handwritten PDFs",
    "Export to Excel (.xlsx) and PowerPoint (.pptx)",
    "Batch convert up to 50 PDFs at once",
    "Page range selection",
  ],
  pro: [
    "Everything in Individual",
    "Always on the latest features",
    "Priority support",
    "Multi-device access",
    "Early feature previews",
  ],
  legal: [
    "Everything in Pro",
    "PDF redaction — black out text locally",
    "Advanced OCR tuned for legal documents",
    "Privilege log export",
    "Team-ready (coming soon)",
  ],
};

function SuccessContent() {
  const params = useSearchParams();
  const [state, setState] = useState<PageState>("activating");
  const [plan, setPlan] = useState<PlanTier>("individual");

  useEffect(() => {
    // LemonSqueezy appends ?order_id= to the success_url
    const orderId  = params.get("order_id") ?? params.get("session_id") ?? "";
    const planParam = (params.get("plan") ?? "") as PlanTier;

    // Validate the plan param — fall back to individual if missing/bogus
    const validPlans: PlanTier[] = ["individual", "pro", "legal"];
    const resolvedPlan: PlanTier = validPlans.includes(planParam) ? planParam : "individual";

    // Minimal guard: we need at least an order_id from LemonSqueezy
    if (!orderId) {
      // Could be a direct visit — check if already activated
      const existing = getPlan();
      if (existing !== "free") {
        setPlan(existing);
        setState("done");
      } else {
        setState("error");
      }
      return;
    }

    try {
      activatePlan(resolvedPlan, orderId);
      setPlan(resolvedPlan);
      setState("done");
    } catch {
      setState("error");
    }
  }, [params]);

  const meta = PLAN_META[plan];
  const perks = PLAN_PERKS[plan];

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 48px", borderBottom: "1px solid var(--border)",
      }}>
        <Link href="/" style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)", textDecoration: "none" }}>
          Priva<span style={{ color: "var(--accent)" }}>PDF</span>
        </Link>
      </nav>

      {/* Content */}
      <main style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 24px",
      }}>
        {state === "activating" && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Loader2
              size={40}
              color="var(--accent)"
              style={{ animation: "spin 0.9s linear infinite" }}
            />
            <p style={{ fontSize: 16, color: "var(--muted)" }}>Activating your plan…</p>
          </div>
        )}

        {state === "error" && (
          <div style={{
            maxWidth: 480, width: "100%",
            background: "var(--paper)", border: "1px solid var(--border)",
            borderRadius: 20, padding: "40px 36px", textAlign: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              width: 56, height: 56, background: "#fef0ef", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
            }}>
              <AlertCircle size={28} color="#b0392a" />
            </div>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, marginBottom: 12, color: "var(--ink)" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 28 }}>
              We couldn&apos;t verify your order. If you completed checkout, please contact
              support with your order confirmation and we&apos;ll activate your plan manually.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/convert" style={{
                display: "block", padding: "12px 0", borderRadius: 8,
                background: "var(--ink)", color: "var(--paper)",
                fontWeight: 600, fontSize: 14, textAlign: "center", textDecoration: "none",
              }}>
                Back to converter
              </Link>
              <a href="mailto:support@privapdf.com" style={{
                display: "block", padding: "11px 0", borderRadius: 8,
                background: "var(--cream)", color: "var(--ink)", border: "1px solid var(--border)",
                fontWeight: 500, fontSize: 13, textAlign: "center", textDecoration: "none",
              }}>
                Contact support
              </a>
            </div>
          </div>
        )}

        {state === "done" && (
          <div style={{
            maxWidth: 520, width: "100%",
            background: "var(--paper)", border: "1px solid var(--border)",
            borderRadius: 20, padding: "40px 36px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{
                width: 64, height: 64, background: "#e8f5e9", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
              }}>
                <CheckCircle size={32} color="var(--accent)" />
              </div>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, marginBottom: 8, color: "var(--ink)" }}>
                You&apos;re all set!
              </h1>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "var(--accent-light)", border: "1px solid var(--accent)",
                borderRadius: 20, padding: "4px 14px",
                fontSize: 12, fontWeight: 600, color: "var(--accent)",
                letterSpacing: 0.5,
              }}>
                {meta.label} plan activated
              </div>
            </div>

            {/* Perks */}
            <div style={{
              background: "var(--cream)", borderRadius: 12, border: "1px solid var(--border)",
              padding: "18px 20px", marginBottom: 28,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
                What&apos;s now unlocked
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {perks.map((perk) => (
                  <li key={perk} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--ink)" }}>
                    <span style={{ color: "var(--accent)", flexShrink: 0, fontSize: 14, lineHeight: 1.4 }}>✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <Link href="/convert" style={{
              display: "block", padding: "14px 0", borderRadius: 10,
              background: "var(--ink)", color: "var(--paper)",
              fontWeight: 600, fontSize: 15, textAlign: "center", textDecoration: "none",
            }}>
              Start converting →
            </Link>

            <p style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              Your plan is saved in this browser.{" "}
              {plan === "individual"
                ? "It never expires — yours forever."
                : "It renews automatically each billing period."}
              <br />
              Questions? <a href="mailto:support@privapdf.com" style={{ color: "var(--accent)", textDecoration: "none" }}>support@privapdf.com</a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
