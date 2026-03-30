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
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-white/10 flex items-center justify-center">
          <Brain className="w-7 h-7 text-purple-300" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-lg">
            {isReady ? "AI Engine Ready" : "Loading AI Engine"}
          </h3>
          <p className="text-sm text-white/50">
            {isReady
              ? "Models cached — will be instant next time"
              : "Downloads once, then works fully offline"}
          </p>
        </div>
      </div>

      {/* Progress */}
      {!isReady && <ProgressBar percent={percent} stage={stage} color="orange" />}

      {/* Status chips */}
      <div className="flex flex-wrap gap-3">
        <StatusChip
          icon={<Cpu className="w-3.5 h-3.5" />}
          label={gpuDevice === "webgpu" ? "WebGPU Active" : "CPU/WASM Mode"}
          active={!!gpuDevice}
          color={gpuDevice === "webgpu" ? "green" : "blue"}
        />
        <StatusChip
          icon={isReady ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          label={isReady ? "Works Offline Now" : "Downloading models..."}
          active={isReady}
          color="green"
        />
      </div>

      {/* Explanation */}
      {!isReady && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/50 space-y-1">
          <p>⚡ <strong className="text-white/70">Text PDFs convert instantly</strong> without this download.</p>
          <p>🔍 This AI engine is only needed for <strong className="text-white/70">scanned/image PDFs</strong>.</p>
          <p>💾 Models are cached in your browser — next visit loads in seconds.</p>
        </div>
      )}

      {/* Skip button */}
      {!isReady && onSkip && (
        <button
          onClick={onSkip}
          className="text-sm text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
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
    green: "bg-green-500/10 border-green-500/30 text-green-300",
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-300",
  };

  return (
    <span
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
        active ? colors[color] : "bg-white/5 border-white/10 text-white/30"
      }`}
    >
      {icon}
      {label}
    </span>
  );
}
