"use client";

import { useState } from "react";
import { useConverter } from "@/hooks/useConverter";
import { DropZone } from "@/components/DropZone";
import { ProgressBar } from "@/components/ProgressBar";
import { WarmupScreen } from "@/components/WarmupScreen";
import { UpgradeModal } from "@/components/UpgradeModal";
import { FormatSelector } from "@/components/FormatSelector";
import { PageRangePicker } from "@/components/PageRangePicker";
import { BatchQueue } from "@/components/BatchQueue";
import { UserMenuButton } from "@/components/UserMenuButton";
import {
  CheckCircle,
  AlertCircle,
  Cpu,
  MemoryStick,
  RotateCcw,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";

type Tab = "single" | "batch";

export default function ConvertPage() {
  const [activeTab, setActiveTab] = useState<Tab>("single");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    status,
    progress,
    error,
    remainingConversions,
    isPro,
    plan,
    planMeta,
    canUseOCR,
    canUseBatch,
    canUseXlsx,
    canUsePptx,
    canUsePageRange,
    workerReady,
    workerLoading,
    workerProgress,
    gpuDevice,
    memoryWarning,
    outputFormat,
    pageRange,
    totalPages,
    batchJobs,
    limitReason,
    setOutputFormat,
    setPageRange,
    loadAIModels,
    convertFile,
    addBatchFiles,
    removeBatchJob,
    runBatch,
    reset,
  } = useConverter();

  const isConverting = ["parsing", "analyzing", "building"].includes(status);
  const isBatchRunning = isConverting && activeTab === "batch";

  // Format display for success message
  const formatName =
    outputFormat === "docx" ? "Word (.docx)" :
    outputFormat === "xlsx" ? "Excel (.xlsx)" :
    outputFormat === "pptx" ? "PowerPoint (.pptx)" :
    "Text (.txt)";

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="nav-root">
        <Link href="/" style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)", textDecoration: "none", letterSpacing: "-0.3px" }}>
          Priva<span style={{ color: "var(--accent)" }}>PDF</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Link href="/tools" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>PDF Tools</Link>
          {/* GPU badge */}
          {workerReady && (
            <span style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "var(--accent)", background: "var(--accent-light)",
              padding: "4px 12px", borderRadius: 20, fontWeight: 500,
            }}>
              <Cpu size={12} />
              {gpuDevice === "webgpu" ? "WebGPU active" : "CPU mode"}
            </span>
          )}
          {!isPro ? (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {remainingConversions} free {remainingConversions === 1 ? "conversion" : "conversions"} left today
            </span>
          ) : (
            <span style={{
              fontSize: 12, color: planMeta.color, background: "var(--accent-light)",
              padding: "4px 12px", borderRadius: 20, fontWeight: 500,
            }}>
              {planMeta.badge}
            </span>
          )}
          <UserMenuButton />
        </div>
      </nav>

      {/* ── Beta banner ─────────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff7ed", borderBottom: "1px solid #fbbf72",
        padding: "10px 48px", display: "flex", alignItems: "center", gap: 10,
        fontSize: 13, color: "#92400e", flexWrap: "wrap",
      }}>
        <span>🎉</span>
        <span>
          <strong>Public Beta:</strong> OCR, Excel, PowerPoint, batch, Lock &amp; Sign are all free until{" "}
          <strong>July 4, 2026</strong>.{" "}
          <a href="/#pricing" style={{ color: "#92400e", fontWeight: 600, textDecoration: "underline" }}>Lock in Individual ($19) to keep them →</a>
        </span>
      </div>

      {/* ── Memory warning ───────────────────────────────────────────────────── */}
      {memoryWarning && (
        <div style={{
          background: "#fff3cd", borderBottom: "1px solid #ffc107",
          padding: "12px 48px", display: "flex", alignItems: "center", gap: 8,
          fontSize: 14, color: "#856404",
        }}>
          <MemoryStick size={16} />
          Memory usage is high. Consider closing other tabs for better performance.
        </div>
      )}

      <main className="convert-main">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <h1 style={{
            fontFamily: "var(--serif)", fontSize: "clamp(28px, 4vw, 44px)",
            lineHeight: 1.1, letterSpacing: -1, marginBottom: 10,
          }}>
            Convert PDF — nothing uploaded
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6, fontWeight: 300 }}>
            Drop a PDF. Your file converts{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 500 }}>entirely in this tab</strong> and downloads automatically.
          </p>
        </div>

        {/* ── Privacy strip ─────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 24, marginBottom: 32,
          flexWrap: "wrap",
        }}>
          {[
            { icon: <ShieldCheck size={13} />, label: "No upload" },
            { icon: <ShieldCheck size={13} />, label: "No account" },
            { icon: <ShieldCheck size={13} />, label: "Works offline" },
          ].map((item) => (
            <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
              {item.icon}{item.label}
            </span>
          ))}
        </div>

        {/* ── Tabs: Single / Batch ──────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 0, marginBottom: 24,
          border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
          background: "var(--cream)", width: "fit-content",
        }}>
          {(["single", "batch"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); reset(); }}
              style={{
                padding: "10px 24px",
                border: "none",
                borderRight: tab === "single" ? "1px solid var(--border)" : "none",
                background: activeTab === tab ? "var(--paper)" : "transparent",
                color: activeTab === tab ? "var(--ink)" : "var(--muted)",
                fontWeight: activeTab === tab ? 500 : 400,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "var(--sans)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tab === "single" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Single file
                </>
              ) : (
                <>
                  <Layers size={14} />
                  Batch{!canUseBatch && <span style={{ marginLeft: 4, fontSize: 10, background: "var(--accent)", color: "#fff", padding: "1px 5px", borderRadius: 20, fontWeight: 600 }}>PRO</span>}
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── Main card ─────────────────────────────────────────────────────── */}
        <div className="convert-card">

          {/* ── SINGLE FILE TAB ── */}
          {activeTab === "single" && (
            <>
              {/* IDLE */}
              {status === "idle" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* ── Format pill row — visible at a glance ── */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(["docx", "xlsx", "pptx", "txt"] as const).map((fmt) => {
                      const labels: Record<string, string> = { docx: "Word", xlsx: "Excel", pptx: "PowerPoint", txt: "Text" };
                      const locked = (fmt === "xlsx" && !canUseXlsx) || (fmt === "pptx" && !canUsePptx);
                      const active = outputFormat === fmt;
                      return (
                        <button
                          key={fmt}
                          onClick={() => !locked && setOutputFormat(fmt)}
                          title={locked ? "Upgrade to use this format" : undefined}
                          style={{
                            padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: active ? 600 : 400,
                            border: active ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                            background: active ? "var(--accent-light)" : "var(--paper)",
                            color: locked ? "var(--border)" : active ? "var(--accent)" : "var(--muted)",
                            cursor: locked ? "not-allowed" : "pointer", fontFamily: "var(--sans)",
                            display: "flex", alignItems: "center", gap: 6, transition: "all 0.12s",
                          }}
                        >
                          {labels[fmt]}
                          {locked && <span style={{ fontSize: 9, background: "var(--accent)", color: "#fff", padding: "1px 5px", borderRadius: 10, fontWeight: 700 }}>PRO</span>}
                        </button>
                      );
                    })}
                  </div>

                  <DropZone onFile={convertFile} disabled={false} />

                  {/* ── Advanced options toggle ── */}
                  <button
                    onClick={() => setShowAdvanced((v) => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "none", border: "none", padding: 0,
                      fontSize: 13, color: "var(--muted)", cursor: "pointer",
                      fontFamily: "var(--sans)", fontWeight: 500, width: "fit-content",
                    }}
                  >
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showAdvanced ? "Hide advanced options" : "Advanced options"}
                  </button>

                  {showAdvanced && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "20px 24px", background: "var(--cream)", borderRadius: 12, border: "1px solid var(--border)" }}>
                      {/* Full format selector */}
                      <FormatSelector
                        value={outputFormat}
                        onChange={setOutputFormat}
                        isPro={isPro}
                        canUseXlsx={canUseXlsx}
                        canUsePptx={canUsePptx}
                      />

                      {/* Page range */}
                      {!canUsePageRange ? (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Page Range</p>
                          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                            Page range selection is available on paid plans.{" "}
                            <a href="/#pricing" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Upgrade →</a>
                          </p>
                        </div>
                      ) : totalPages > 0 ? (
                        <PageRangePicker totalPages={totalPages} value={pageRange} onChange={setPageRange} />
                      ) : (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Page Range</p>
                          <p style={{ fontSize: 13, color: "var(--muted)" }}>Drop a PDF above to select page ranges</p>
                        </div>
                      )}

                      {/* AI OCR */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12, fontWeight: 500 }}>
                          🔍 Scanned PDF? Enable AI OCR:
                        </p>
                        {!canUseOCR ? (
                          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                            AI OCR is available on paid plans.{" "}
                            <a href="/#pricing" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Upgrade →</a>
                          </p>
                        ) : !workerReady && !workerLoading ? (
                          <button
                            onClick={loadAIModels}
                            style={{
                              background: "var(--ink)", color: "var(--paper)",
                              border: "none", padding: "9px 18px", borderRadius: 8,
                              fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)",
                            }}
                          >
                            Load AI OCR (~500 MB, one-time)
                          </button>
                        ) : workerLoading ? (
                          <WarmupScreen stage={workerProgress.stage} percent={workerProgress.percent} gpuDevice={gpuDevice} onSkip={() => {}} />
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
                            <CheckCircle size={15} /> AI OCR ready — scanned PDFs supported
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CONVERTING */}
              {isConverting && activeTab === "single" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "16px 0" }}>
                  <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <div style={{
                      width: 56, height: 56, background: "var(--accent-light)", borderRadius: 16,
                      display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <h3 style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 4 }}>Converting…</h3>
                    <p style={{ fontSize: 14, color: "var(--muted)" }}>
                      Processing entirely in your browser · converting to {formatName}
                    </p>
                  </div>
                  <ProgressBar percent={progress.percent} stage={progress.stage} color="green" />
                </div>
              )}

              {/* DONE */}
              {status === "done" && activeTab === "single" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "16px 0", textAlign: "center" }}>
                  <div style={{
                    width: 64, height: 64, background: "#e8f5e9", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <CheckCircle size={32} color="var(--accent)" />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--serif)", fontSize: 26, marginBottom: 8 }}>Conversion complete!</h3>
                    <p style={{ fontSize: 15, color: "var(--muted)" }}>
                      Your <strong style={{ color: "var(--ink)" }}>{formatName}</strong> file downloaded automatically.
                      Check your Downloads folder.
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "var(--ink)", color: "var(--paper)",
                      border: "none", padding: "12px 24px", borderRadius: 8,
                      fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)",
                    }}
                  >
                    <RotateCcw size={14} /> Convert another PDF
                  </button>
                </div>
              )}

              {/* ERROR */}
              {status === "error" && activeTab === "single" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "16px 0", textAlign: "center" }}>
                  <div style={{
                    width: 64, height: 64, background: "#fef0ef", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <AlertCircle size={32} color="#b0392a" />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 8, color: "#b0392a" }}>Something went wrong</h3>
                    <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 400 }}>{error}</p>
                  </div>
                  <button
                    onClick={reset}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "var(--ink)", color: "var(--paper)",
                      border: "none", padding: "12px 24px", borderRadius: 8,
                      fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)",
                    }}
                  >
                    <RotateCcw size={14} /> Try again
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── BATCH TAB ── */}
          {activeTab === "batch" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {!canUseBatch ? (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                  padding: "48px 32px", textAlign: "center",
                  background: "var(--cream)", borderRadius: 16, border: "1px solid var(--border)",
                }}>
                  <div style={{
                    width: 52, height: 52, background: "var(--accent-light)", borderRadius: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Layers size={24} color="var(--accent)" />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--serif)", fontSize: 20, marginBottom: 8 }}>Batch conversion is a paid feature</h3>
                    <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, maxWidth: 380 }}>
                      Convert multiple PDFs at once with the Individual, Pro, or Legal plan.
                    </p>
                  </div>
                  <a href="/#pricing" style={{
                    display: "inline-block", background: "var(--ink)", color: "var(--paper)",
                    padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                    textDecoration: "none",
                  }}>
                    See plans →
                  </a>
                </div>
              ) : (
                <>
                  {/* Format selector for batch */}
                  <FormatSelector
                    value={outputFormat}
                    onChange={setOutputFormat}
                    isPro={isPro}
                    canUseXlsx={canUseXlsx}
                    canUsePptx={canUsePptx}
                  />

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                    <BatchQueue
                      jobs={batchJobs}
                      onRemove={removeBatchJob}
                      onAddFiles={addBatchFiles}
                      onRun={runBatch}
                      isRunning={isBatchRunning}
                      isPro={isPro}
                    />
                  </div>

                  {/* Batch progress */}
                  {isBatchRunning && (
                    <div style={{ paddingTop: 8 }}>
                      <ProgressBar percent={progress.percent} stage={progress.stage} color="green" />
                    </div>
                  )}

                  {/* Batch done summary */}
                  {status === "done" && activeTab === "batch" && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "16px 20px",
                      background: "#e8f5e9",
                      borderRadius: 12,
                    }}>
                      <CheckCircle size={20} color="var(--accent)" />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: "var(--accent)", marginBottom: 2 }}>Batch complete!</p>
                        <p style={{ fontSize: 13, color: "var(--muted)" }}>All files downloaded. Check your Downloads folder.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Tips footer ───────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 28, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center",
        }}>
          {[
            "Text PDFs: instant · no AI needed",
            "Scanned PDFs: AI OCR in Advanced options",
            "Large files (>50 MB): close other tabs for speed",
          ].map((tip) => (
            <span key={tip} style={{
              fontSize: 12, color: "var(--muted)",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ width: 4, height: 4, background: "var(--accent)", borderRadius: "50%", flexShrink: 0 }} />
              {tip}
            </span>
          ))}
        </div>
      </main>

      {/* ── Upgrade modal ─────────────────────────────────────────────────── */}
      {status === "limit_reached" && <UpgradeModal onClose={reset} reason={limitReason} />}
    </div>
  );
}
