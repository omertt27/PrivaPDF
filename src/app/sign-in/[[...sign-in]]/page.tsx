import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--paper)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
        <a href="/" style={{
          fontFamily: "var(--serif), Georgia, serif",
          fontSize: 24, color: "var(--ink, #0f0e0d)", textDecoration: "none",
        }}>
          Priva<span style={{ color: "var(--accent, #1a472a)" }}>PDF</span>
        </a>
        <SignIn />
        <p style={{ fontSize: 12, color: "var(--muted, #6b6760)", textAlign: "center", maxWidth: 300, lineHeight: 1.5 }}>
          Sign in to restore your plan on any device.
          Your files are still <strong>never uploaded</strong> — auth is only for plan management.
        </p>
      </div>
    </div>
  );
}
