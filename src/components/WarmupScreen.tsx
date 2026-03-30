"use client";
// WarmupScreen.tsx — shown during AI model download (first visit only)

import { Brain, Cpu, Wifi, WifiOff } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

interface WarmupScreenProps {
  stage: string;
  percent: number;
  gpuDevice?: string;
  onSkip?: () => void;
}

export function WarmupScreen({ stage, percent, gpuDevice, onSkip }: WarmupScreenProps) {
  const isReady = percent >= 100;

  return (
    <div style={{
      width: "100%",
      border: "1px solid var(--border)",
      borderRadius: 16,
      background: "var(--cream)",
      padding: 28,
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "var(--accent-light)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Brain size={24} color="var(--accent)" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>
            {isReady ? "AI Engine Ready" : "Loading AI Engine"}
          </h3>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            {isReady
              ? "Models cached — will be instant next time"
              : "Downloads once, then works fully offline"}
          </p>
        </div>
      </div>

      {/* Progress */}
      {!isReady && <ProgressBar percent={percent} stage={stage} color="orange" />}

      {/* Status chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <StatusChip
          icon={<Cpu size={12} />}
          label={gpuDevice === "webgpu" ? "WebGPU Active" : "CPU/WASM Mode"}
          active={!!gpuDevice}
          color={gpuDevice === "webgpu" ? "green" : "blue"}
        />
        <StatusChip
          icon={isReady ? <WifiOff size={12} /> : <Wifi size={12} />}
          label={isReady ? "Works Offline Now" : "Downloading models..."}
          active={isReady}
          color="green"
        />
      </div>

      {/* Explanation */}
      {!isReady && (
        <div style={{
          padding: "14px 16px",
          background: "var(--paper)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          fontSize: 13,
          color: "var(--muted)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          lineHeight: 1.6,
        }}>
          <p>⚡ <strong style={{ color: "var(--ink)" }}>Text PDFs convert instantly</strong> without this download.</p>
          <p>🔍 This AI engine is only needed for <strong style={{ color: "var(--ink)" }}>scanned/image PDFs</strong>.</p>
          <p>💾 Models are cached in your browser — next visit loads in seconds.</p>
        </div>
      )}

      {/* Skip button */}
      {!isReady && onSkip && (
        <button
          onClick={onSkip}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: "var(--muted)", textDecoration: "underline",
            textUnderlineOffset: 2, fontFamily: "var(--sans)", padding: 0,
            textAlign: "left",
          }}
        >
          Skip AI — I only have text-based PDFs
        </button>
      )}
    </div>
  );
}

function StatusChip({
  icon,
  label,
  active,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  color: "green" | "blue";
}) {
  const colors = {
    green: { bg: "var(--accent-light)", border: "1px solid var(--accent)", text: "var(--accent)" },
    blue: { bg: "#e8f0ff", border: "1px solid #93aaf0", text: "#3b5bdb" },
  };
  const c = active ? colors[color] : { bg: "var(--cream)", border: "1px solid var(--border)", text: "var(--muted)" };

  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 20,
      background: c.bg, border: c.border, color: c.text,
      fontSize: 12, fontWeight: 500,
    }}>
      {icon}
      {label}
    </span>
  );
}
