import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
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
        <SignUp />
        <p style={{ fontSize: 12, color: "var(--muted, #6b6760)", textAlign: "center", maxWidth: 300, lineHeight: 1.5 }}>
          Create an account to access your plan on any device.
          Your files are still <strong>never uploaded</strong>.
        </p>
      </div>
    </div>
  );
}
