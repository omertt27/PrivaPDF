"use client";
// EmailCaptureModal.tsx
// Shown once to free users when they've used 2 of their 3 daily conversions.
// A gentle nudge — entering an email extends trial limits, closing it dismisses forever.

import { useState } from "react";
import { X, Mail } from "lucide-react";
import { setCapturedEmail } from "@/lib/usage-gate";

interface Props {
  onClose: () => void;
}

export function EmailCaptureModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    // Save locally first so it's captured even if the API call fails
    setCapturedEmail(trimmed);
    // Persist to server (fire-and-forget — failure is acceptable)
    fetch("/api/email-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    }).catch(() => { /* localStorage fallback already saved it */ });
    setSubmitted(true);
    setTimeout(onClose, 1800);
  }

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
          background: "rgba(15,14,13,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Card */}
      <div style={{
        position: "relative",
        width: "100%", maxWidth: 420,
        background: "var(--paper)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "0 24px 56px rgba(0,0,0,0.14)",
        padding: "36px 32px 28px",
        display: "flex", flexDirection: "column", gap: 18,
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 14, right: 14,
            background: "none", border: "none",
            cursor: "pointer", padding: 6, borderRadius: 8,
            color: "var(--muted)",
          }}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "var(--accent-light)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto",
        }}>
          <Mail size={24} color="var(--accent)" />
        </div>

        {submitted ? (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--ink)", marginBottom: 8 }}>
              You&apos;re all set! ✓
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              We&apos;ll let you know about updates and feature releases.
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--ink)", marginBottom: 8 }}>
                Almost out of free conversions
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
                Drop your email to get product updates — we won&apos;t spam you.
                Or <a href="/#pricing" style={{ color: "var(--accent)", textDecoration: "underline" }}>upgrade</a> for unlimited access.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                autoFocus
                style={{
                  width: "100%", padding: "11px 14px",
                  border: `1.5px solid ${error ? "#b0392a" : "var(--border)"}`,
                  borderRadius: 8, fontSize: 14,
                  fontFamily: "var(--sans)", color: "var(--ink)",
                  background: "var(--paper)", outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {error && <p style={{ fontSize: 12, color: "#b0392a", margin: "-4px 0 0" }}>{error}</p>}
              <button
                type="submit"
                style={{
                  background: "var(--ink)", color: "var(--paper)",
                  border: "none", padding: "12px", borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  fontFamily: "var(--sans)",
                }}
              >
                Keep me updated
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "none", border: "none", padding: "6px",
                  fontSize: 12, color: "var(--muted)", cursor: "pointer",
                  fontFamily: "var(--sans)", textDecoration: "underline",
                }}
              >
                No thanks, continue without
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", margin: "-6px 0 0" }}>
          No spam · Unsubscribe any time · Your files still never leave your device
        </p>
      </div>
    </div>
  );
}
