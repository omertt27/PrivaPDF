"use client";
// ProgressBar.tsx — animated progress bar with stage label

interface ProgressBarProps {
  percent: number;
  stage: string;
  color?: "blue" | "green" | "orange";
}

const colorMap = {
  blue: "#3b82f6",
  green: "var(--accent)",
  orange: "#f97316",
};

export function ProgressBar({ percent, stage, color = "green" }: ProgressBarProps) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
          {stage}
        </span>
        <span style={{ fontSize: 13, color: "var(--muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {Math.round(percent)}%
        </span>
      </div>
      <div style={{
        width: "100%", height: 8, borderRadius: 4,
        background: "var(--cream)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}>
        <div
          style={{
            height: "100%",
            borderRadius: 4,
            background: colorMap[color],
            width: `${Math.min(100, Math.max(0, percent))}%`,
            transition: "width 0.3s ease-out",
          }}
        />
      </div>
    </div>
  );
}
