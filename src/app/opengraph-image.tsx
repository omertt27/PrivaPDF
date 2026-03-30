import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";
export const alt = "PrivaPDF — PDF Converter That Never Uploads Your Files";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#faf8f4",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 96px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Accent bar */}
        <div style={{ width: 48, height: 4, background: "#1a472a", marginBottom: 40, borderRadius: 2 }} />

        {/* Logo */}
        <div style={{ fontSize: 32, fontWeight: 400, color: "#0f0e0d", marginBottom: 32 }}>
          Priva<span style={{ color: "#1a472a" }}>PDF</span>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 72, fontWeight: 400, color: "#0f0e0d", lineHeight: 1.05, marginBottom: 32, maxWidth: 900 }}>
          PDF to Word.{" "}
          <span style={{ color: "#1a472a", fontStyle: "italic" }}>Without uploading it.</span>
        </div>

        {/* Subtext */}
        <div style={{ fontSize: 28, color: "#6b6760", fontFamily: "sans-serif", fontWeight: 300, maxWidth: 700 }}>
          Runs entirely in your browser · Zero servers · Works offline
        </div>

        {/* Trust badges */}
        <div style={{ display: "flex", gap: 24, marginTop: 52 }}>
          {["0 bytes uploaded", "Free to start", "Works offline"].map((t) => (
            <div key={t} style={{
              background: "#e8f0eb", color: "#1a472a", fontSize: 20,
              fontFamily: "sans-serif", fontWeight: 500,
              padding: "10px 22px", borderRadius: 8,
            }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
