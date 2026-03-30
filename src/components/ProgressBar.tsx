"use client";
// ProgressBar.tsx — animated progress bar with stage label

import { clsx } from "clsx";

interface ProgressBarProps {
  percent: number;
  stage: string;
  color?: "blue" | "green" | "orange";
}

export function ProgressBar({ percent, stage, color = "blue" }: ProgressBarProps) {
  const colorMap = {
    blue: "from-blue-500 to-blue-400",
    green: "from-green-500 to-emerald-400",
    orange: "from-orange-500 to-amber-400",
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70 truncate max-w-[80%]">{stage}</span>
        <span className="text-white/50 font-mono tabular-nums">{Math.round(percent)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full bg-gradient-to-r transition-all duration-300 ease-out",
            colorMap[color]
          )}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
