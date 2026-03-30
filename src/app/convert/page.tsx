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
import {
  CheckCircle,
  AlertCircle,
  Cpu,
  MemoryStick,
  RotateCcw,
  ShieldCheck,
  Layers,
} from "lucide-react";
import Link from "next/link";

type Tab = "single" | "batch";

export default function ConvertPage() {
  const [activeTab, setActiveTab] = useState<Tab>("single");

  const {
    status,
    progress,
    error,
    remainingConversions,
    isPro,
    plan,
    planMeta,
    workerReady,
    workerLoading,
    workerProgress,
    gpuDevice,
    memoryWarning,
    outputFormat,
    pageRange,
    totalPages,
    batchJobs,
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
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 48px", borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, background: "var(--paper)", zIndex: 100,
      }}>
        <Link href="/" style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)", textDecoration: "none", letterSpacing: "-0.3px" }}>
          Priva<span style={{ color: "var(--accent)" }}>PDF</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
        </div>
      </nav>

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

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "64px 24px" }}>
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{
            fontSize: 11, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
            color: "var(--accent)", marginBottom: 16, display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
          }}>
            <span style={{ width: 20, height: 1, background: "var(--accent)", display: "inline-block" }} />
            Privacy-first conversion
            <span style={{ width: 20, height: 1, background: "var(--accent)", display: "inline-block" }} />
          </div>
          <h1 style={{
            fontFamily: "var(--serif)", fontSize: "clamp(32px, 5vw, 52px)",
            lineHeight: 1.1, letterSpacing: -1.5, marginBottom: 16,
          }}>
            Convert your PDF
          </h1>
          <p style={{ fontSize: 16, color: "var(--muted)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7, fontWeight: 300 }}>
            Your file is processed entirely in this browser tab.{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 500 }}>Nothing is ever uploaded.</strong>
          </p>
        </div>

        {/* ── Privacy strip ─────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 32, marginBottom: 40,
          padding: "14px 24px", background: "var(--cream)", borderRadius: 12,
          border: "1px solid var(--border)", flexWrap: "wrap",
        }}>
          {[
            { icon: <ShieldCheck size={13} />, label: "Files stay local" },
            { icon: <ShieldCheck size={13} />, label: "No account needed" },
            { icon: <ShieldCheck size={13} />, label: "Works offline" },
          ].map((item) => (
            <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
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
                  Batch{!isPro && <span style={{ marginLeft: 4, fontSize: 10, background: "var(--accent)", color: "#fff", padding: "1px 5px", borderRadius: 20, fontWeight: 600 }}>PRO</span>}
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── Main card ─────────────────────────────────────────────────────── */}
        <div style={{
          background: "var(--paper)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "40px 40px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>

          {/* ── SINGLE FILE TAB ── */}
          {activeTab === "single" && (
            <>
              {/* IDLE */}
              {status === "idle" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  <DropZone onFile={convertFile} disabled={false} />

                  {/* Options row */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 24,
                    paddingTop: 24,
                    borderTop: "1px solid var(--border)",
                  }}>
                    {/* Format selector */}
                    <FormatSelector value={outputFormat} onChange={setOutputFormat} isPro={isPro} />

                    {/* Page range — only shown after a file is selected if we know total pages */}
                    {totalPages > 0 ? (
                      <PageRangePicker
                        totalPages={totalPages}
                        value={pageRange}
                        onChange={setPageRange}
                      />
                    ) : (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                          Page Range
                        </p>
                        <p style={{ fontSize: 13, color: "var(--muted)" }}>
                          Drop a PDF to unlock page range selection
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI OCR section */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                    <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, fontWeight: 500 }}>
                      🔍 Have a <strong style={{ color: "var(--ink)" }}>scanned PDF</strong>? Enable AI OCR:
                    </p>
                    {!workerReady && !workerLoading && (
                      <button
                        onClick={loadAIModels}
                        style={{
                          background: "var(--ink)", color: "var(--paper)",
                          border: "none", padding: "10px 20px", borderRadius: 8,
                          fontSize: 14, fontWeight: 500, cursor: "pointer",
                          fontFamily: "var(--sans)",
                        }}
                      >
                        Load AI OCR Engine (~500 MB, one-time download)
                      </button>
                    )}
                    {workerLoading && (
                      <WarmupScreen
                        stage={workerProgress.stage}
                        percent={workerProgress.percent}
                        gpuDevice={gpuDevice}
                        onSkip={() => {}}
                      />
                    )}
                    {workerReady && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--accent)", fontWeight: 500 }}>
                        <CheckCircle size={16} />
                        AI OCR engine ready — scanned PDFs fully supported
                      </div>
                    )}
                  </div>
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
              {/* Format selector for batch */}
              <FormatSelector value={outputFormat} onChange={setOutputFormat} isPro={isPro} />

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
            </div>
          )}
        </div>

        {/* ── Tips footer ───────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 32, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center",
        }}>
          {[
            "Text PDFs convert instantly — no AI needed",
            "Scanned PDFs need AI OCR (one-time 500 MB download)",
            "All processing happens in this browser tab",
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
      {status === "limit_reached" && <UpgradeModal onClose={reset} />}
    </div>
  );
}
