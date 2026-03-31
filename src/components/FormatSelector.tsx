"use client";
// FormatSelector.tsx — Output format picker (DOCX / XLSX / TXT / PPTX)

import type { OutputFormat } from "@/hooks/useConverter";

interface FormatSelectorProps {
  value: OutputFormat;
  onChange: (f: OutputFormat) => void;
  isPro: boolean;
  canUseXlsx?: boolean;
  canUsePptx?: boolean;
}

const FORMATS: {
  id: OutputFormat;
  label: string;
  ext: string;
  desc: string;
  icon: React.ReactNode;
  proOnly?: boolean;
}[] = [
  {
    id: "docx",
    label: "Word",
    ext: ".docx",
    desc: "Tables, headings & formatting preserved",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    id: "xlsx",
    label: "Excel",
    ext: ".xlsx",
    desc: "Tables → separate sheets, text content included",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
        <line x1="15" y1="3" x2="15" y2="21"/>
      </svg>
    ),
    proOnly: true,
  },
  {
    id: "pptx",
    label: "PowerPoint",
    ext: ".pptx",
    desc: "One slide per page, tables & headings formatted",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M8 4v16"/>
        <path d="M2 12h6"/>
      </svg>
    ),
    proOnly: true,
  },
  {
    id: "txt",
    label: "Plain Text",
    ext: ".txt",
    desc: "Clean UTF-8 text, ASCII table formatting",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
];

export function FormatSelector({ value, onChange, isPro, canUseXlsx, canUsePptx }: FormatSelectorProps) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
        Output Format
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FORMATS.map((fmt) => {
          // Use fine-grained feature flags when provided, fall back to isPro
          const locked =
            fmt.proOnly &&
            (fmt.id === "xlsx" ? !(canUseXlsx ?? isPro) :
             fmt.id === "pptx" ? !(canUsePptx ?? isPro) :
             !isPro);
          const active = value === fmt.id;

          return (
            <button
              key={fmt.id}
              onClick={() => { if (!locked) onChange(fmt.id); }}
              title={locked ? `${fmt.label} export is a Pro feature` : fmt.desc}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 14px", borderRadius: 10,
                border: active ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                background: active ? "var(--accent-light)" : "var(--paper)",
                color: locked ? "var(--muted)" : active ? "var(--accent)" : "var(--ink)",
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.6 : 1,
                fontSize: 13, fontWeight: active ? 600 : 400,
                fontFamily: "var(--sans)", transition: "all 0.15s",
              }}
            >
              <span style={{ color: active ? "var(--accent)" : locked ? "var(--muted)" : "var(--ink)", flexShrink: 0 }}>
                {fmt.icon}
              </span>
              <span>{fmt.label}</span>
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{fmt.ext}</span>
              {locked && (
                <span style={{
                  marginLeft: 2, fontSize: 9, background: "var(--accent)", color: "#fff",
                  padding: "1px 5px", borderRadius: 20, fontWeight: 700, letterSpacing: 0.5,
                }}>PRO</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
