"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Merge, Scissors, Minimize2, Unlock, RotateCcw, CheckCircle, AlertCircle, ArrowUp, ArrowDown, EyeOff, FileText } from "lucide-react";
import { usePdfTools } from "@/hooks/usePdfTools";
import { ProgressBar } from "@/components/ProgressBar";
import { UpgradeModal } from "@/components/UpgradeModal";
import { isPaidPlan, hasFeature, getPlan } from "@/lib/usage-gate";
import type { RedactionRect } from "@/lib/pdf-tools";

type ToolTab = "merge" | "split" | "compress" | "unlock" | "redact" | "privilege_log";

const ALL_TABS: { id: ToolTab; label: string; icon: React.ReactNode; badge?: string }[] = [
  { id: "merge",         label: "Merge",       icon: <Merge size={15} /> },
  { id: "split",         label: "Split",        icon: <Scissors size={15} /> },
  { id: "compress",      label: "Compress",     icon: <Minimize2 size={15} /> },
  { id: "unlock",        label: "Unlock",       icon: <Unlock size={15} /> },
  { id: "redact",        label: "Redact",       icon: <EyeOff size={15} />,   badge: "Legal" },
  { id: "privilege_log", label: "Privilege Log",icon: <FileText size={15} />, badge: "Legal" },
];

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<ToolTab>("merge");
  const [upgradeReason, setUpgradeReason] = useState<"tool_limit" | "feature">("tool_limit");
  const tools = usePdfTools();
  const plan = getPlan();
  const isLegal = plan === "legal";

  const isProcessing = tools.status === "processing";

  function switchTab(tab: ToolTab) {
    // Legal-only tabs: show upgrade wall if not on legal plan
    if ((tab === "redact" || tab === "privilege_log") && !isLegal) {
      setUpgradeReason("feature");
      // We show the upgrade modal inline, not via status
      setShowUpgrade(true);
      return;
    }
    setActiveTab(tab);
    tools.reset();
  }

  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      {/* ── Nav ── */}
      <nav className="nav-root">
        <Link href="/" style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)", textDecoration: "none" }}>
          Priva<span style={{ color: "var(--accent)" }}>PDF</span>
        </Link>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Link href="/convert" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>Convert PDF</Link>
          <Link href="/tools" style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, textDecoration: "none" }}>PDF Tools</Link>
          {!isPaidPlan() && (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {tools.remainingToolUses} free tool {tools.remainingToolUses === 1 ? "use" : "uses"} left today
            </span>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "56px 24px", paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}>
        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{
            fontSize: 11, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
            color: "var(--accent)", marginBottom: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <span style={{ width: 20, height: 1, background: "var(--accent)", display: "inline-block" }} />
            100% local · no uploads
            <span style={{ width: 20, height: 1, background: "var(--accent)", display: "inline-block" }} />
          </div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(30px, 4vw, 48px)", lineHeight: 1.1, letterSpacing: -1.5, marginBottom: 14 }}>
            PDF Tools
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", maxWidth: 460, margin: "0 auto", lineHeight: 1.7, fontWeight: 300 }}>
            Merge, split, compress, and unlock PDFs — everything runs in your browser.
            Your files are <strong style={{ color: "var(--ink)", fontWeight: 500 }}>never uploaded.</strong>
          </p>
        </div>

        {/* Tool tabs */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
          border: "1px solid var(--border)", borderRadius: 14,
          overflow: "hidden", marginBottom: 32, background: "var(--cream)",
        }}>
          {ALL_TABS.map((tab, i) => {
            const isLocked = (tab.id === "redact" || tab.id === "privilege_log") && !isLegal;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                title={isLocked ? `${tab.label} — Legal plan only` : tab.label}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 5, padding: "14px 8px",
                  borderRight: i < ALL_TABS.length - 1 ? "1px solid var(--border)" : "none",
                  border: "none",
                  background: activeTab === tab.id ? "var(--paper)" : "transparent",
                  color: isLocked ? "var(--border)" : activeTab === tab.id ? "var(--accent)" : "var(--muted)",
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  fontSize: 11, cursor: isLocked ? "default" : "pointer", fontFamily: "var(--sans)",
                  transition: "all 0.15s",
                  borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                  position: "relative",
                }}
              >
                {tab.icon}
                <span style={{ lineHeight: 1.3, textAlign: "center" }}>{tab.label}</span>
                {tab.badge && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
                    background: isLocked ? "var(--border)" : "var(--accent)",
                    color: "#fff", padding: "1px 5px", borderRadius: 10,
                  }}>{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tool card */}
        <div className="tools-card">
          {/* ── MERGE ── */}
          {activeTab === "merge" && (
            <MergePanel tools={tools} isProcessing={isProcessing} />
          )}
          {/* ── SPLIT ── */}
          {activeTab === "split" && (
            <SplitPanel tools={tools} isProcessing={isProcessing} />
          )}
          {/* ── COMPRESS ── */}
          {activeTab === "compress" && (
            <CompressPanel tools={tools} isProcessing={isProcessing} />
          )}
          {/* ── UNLOCK ── */}
          {activeTab === "unlock" && (
            <UnlockPanel tools={tools} isProcessing={isProcessing} />
          )}
          {/* ── REDACT (Legal) ── */}
          {activeTab === "redact" && (
            <RedactPanel tools={tools} isProcessing={isProcessing} />
          )}
          {/* ── PRIVILEGE LOG (Legal) ── */}
          {activeTab === "privilege_log" && (
            <PrivilegeLogPanel tools={tools} isProcessing={isProcessing} />
          )}

          {/* Shared: progress */}
          {isProcessing && (
            <div style={{ marginTop: 28 }}>
              <ProgressBar percent={tools.progress.percent} stage={tools.progress.stage} color="green" />
            </div>
          )}

          {/* Shared: done */}
          {tools.status === "done" && (
            <div style={{
              marginTop: 24, display: "flex", alignItems: "center", gap: 12,
              padding: "16px 20px", background: "#e8f5e9", borderRadius: 12,
            }}>
              <CheckCircle size={20} color="var(--accent)" />
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--accent)" }}>Done!</p>
                <p style={{ fontSize: 13, color: "var(--muted)" }}>
                  {tools.progress.stage || "File downloaded. Check your Downloads folder."}
                </p>
              </div>
              <button
                onClick={tools.reset}
                style={{
                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                  background: "var(--ink)", color: "var(--paper)",
                  border: "none", padding: "8px 16px", borderRadius: 8,
                  fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)",
                }}
              >
                <RotateCcw size={12} /> Again
              </button>
            </div>
          )}

          {/* Shared: error */}
          {tools.status === "error" && tools.error && (
            <div style={{
              marginTop: 24, display: "flex", alignItems: "center", gap: 12,
              padding: "16px 20px", background: "#fef0ef", borderRadius: 12,
            }}>
              <AlertCircle size={20} color="#b0392a" />
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#b0392a" }}>Error</p>
                <p style={{ fontSize: 13, color: "var(--muted)" }}>{tools.error}</p>
              </div>
              <button
                onClick={tools.reset}
                style={{
                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                  background: "var(--ink)", color: "var(--paper)",
                  border: "none", padding: "8px 16px", borderRadius: 8,
                  fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--sans)",
                }}
              >
                <RotateCcw size={12} /> Try again
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Upgrade modal when daily tool limit reached ── */}
      {(tools.status === "limit_reached" || showUpgrade) && (
        <UpgradeModal
          onClose={() => { tools.reset(); setShowUpgrade(false); }}
          reason={tools.status === "limit_reached" ? "tool_limit" : upgradeReason}
        />
      )}
    </div>
  );
}

// ── Merge Panel ───────────────────────────────────────────────────────────────

function MergePanel({ tools, isProcessing }: { tools: ReturnType<typeof usePdfTools>; isProcessing: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        icon={<Merge size={18} />}
        title="Merge PDFs"
        desc="Drag to reorder · All files processed in your browser · No uploads"
      />

      {/* Drop zone */}
      <PdfDropZone onFiles={tools.addMergeFiles} label="Drop PDFs here or click to add" multiple />

      {/* File list */}
      {tools.mergeFiles.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {tools.mergeFiles.map((f, idx) => (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 16px", borderBottom: idx < tools.mergeFiles.length - 1 ? "1px solid var(--border)" : "none",
              background: "var(--paper)",
            }}>
              <span style={{ fontSize: 12, color: "var(--muted)", width: 20, textAlign: "right", flexShrink: 0 }}>{idx + 1}</span>
              <span style={{ flex: 1, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{formatBytes(f.size)}</span>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <IconBtn disabled={idx === 0} onClick={() => tools.reorderMergeFiles(idx, idx - 1)} title="Move up"><ArrowUp size={12} /></IconBtn>
                <IconBtn disabled={idx === tools.mergeFiles.length - 1} onClick={() => tools.reorderMergeFiles(idx, idx + 1)} title="Move down"><ArrowDown size={12} /></IconBtn>
                <IconBtn onClick={() => tools.removeMergeFile(idx)} title="Remove">✕</IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      <RunButton
        disabled={isProcessing || tools.mergeFiles.length < 2}
        onClick={() => tools.runMerge("merged")}
        isProcessing={isProcessing}
        label={`Merge ${tools.mergeFiles.length} file${tools.mergeFiles.length !== 1 ? "s" : ""} →`}
        disabledReason={tools.mergeFiles.length < 2 ? "Add at least 2 PDF files" : undefined}
      />
    </div>
  );
}

// ── Split Panel ───────────────────────────────────────────────────────────────

function SplitPanel({ tools, isProcessing }: { tools: ReturnType<typeof usePdfTools>; isProcessing: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        icon={<Scissors size={18} />}
        title="Split PDF"
        desc="Extract specific pages as individual PDFs · No uploads"
      />

      <PdfDropZone onFiles={(files) => tools.setSplitFile(files[0] || null)} label="Drop a PDF to split" />

      {tools.splitFile && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", background: "var(--cream)",
          border: "1px solid var(--border)", borderRadius: 10,
        }}>
          <span style={{ fontSize: 13, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tools.splitFile.name}
          </span>
          {tools.splitTotalPages > 0 && (
            <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, flexShrink: 0 }}>
              {tools.splitTotalPages} pages
            </span>
          )}
          <IconBtn onClick={() => tools.setSplitFile(null)} title="Remove">✕</IconBtn>
        </div>
      )}

      {tools.splitFile && tools.splitTotalPages > 0 && (
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", display: "block", marginBottom: 8 }}>
            Pages to extract
          </label>
          <input
            type="text"
            value={tools.splitPageList}
            onChange={(e) => tools.setSplitPageList(e.target.value)}
            placeholder={`e.g. 1,3,5-8 or "all" (1–${tools.splitTotalPages})`}
            style={{
              width: "100%", padding: "10px 14px",
              border: "1.5px solid var(--border)", borderRadius: 8,
              fontSize: 14, fontFamily: "var(--sans)", color: "var(--ink)",
              background: "var(--paper)", outline: "none", boxSizing: "border-box",
            }}
          />
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Each page downloads as a separate PDF. Use commas and ranges: <code>1,3,5-8</code>
          </p>
        </div>
      )}

      <RunButton
        disabled={isProcessing || !tools.splitFile}
        onClick={tools.runSplit}
        isProcessing={isProcessing}
        label="Extract pages →"
        disabledReason={!tools.splitFile ? "Select a PDF first" : undefined}
      />
    </div>
  );
}

// ── Compress Panel ────────────────────────────────────────────────────────────

function CompressPanel({ tools, isProcessing }: { tools: ReturnType<typeof usePdfTools>; isProcessing: boolean }) {
  const qualityLabel =
    tools.compressQuality >= 0.85 ? "Light (high quality)" :
    tools.compressQuality >= 0.65 ? "Medium (recommended)" :
    "Aggressive (smaller file)";

  const estReduction =
    tools.compressQuality >= 0.85 ? "~20–35%" :
    tools.compressQuality >= 0.65 ? "~40–60%" :
    "~60–75%";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        icon={<Minimize2 size={18} />}
        title="Compress PDF"
        desc="Reduce file size by re-rendering at lower quality · No uploads"
      />

      <PdfDropZone onFiles={(files) => tools.setCompressFile(files[0] || null)} label="Drop a PDF to compress" />

      {tools.compressFile && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", background: "var(--cream)",
          border: "1px solid var(--border)", borderRadius: 10,
        }}>
          <span style={{ fontSize: 13, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tools.compressFile.name}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{formatBytes(tools.compressFile.size)}</span>
          <IconBtn onClick={() => tools.setCompressFile(null)} title="Remove">✕</IconBtn>
        </div>
      )}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Compression level</label>
          <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
            {qualityLabel} · Est. {estReduction} reduction
          </span>
        </div>
        <input
          type="range"
          min={0.3}
          max={0.92}
          step={0.05}
          value={tools.compressQuality}
          onChange={(e) => tools.setCompressQuality(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          <span>Smallest file</span>
          <span>Best quality</span>
        </div>
      </div>

      <RunButton
        disabled={isProcessing || !tools.compressFile}
        onClick={tools.runCompress}
        isProcessing={isProcessing}
        label="Compress PDF →"
        disabledReason={!tools.compressFile ? "Select a PDF first" : undefined}
      />
    </div>
  );
}

// ── Unlock Panel ──────────────────────────────────────────────────────────────

function UnlockPanel({ tools, isProcessing }: { tools: ReturnType<typeof usePdfTools>; isProcessing: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        icon={<Unlock size={18} />}
        title="Unlock PDF"
        desc="Remove password protection · Password never sent to any server"
      />

      <div style={{
        padding: "12px 16px", background: "var(--accent-light)",
        border: "1px solid var(--accent)", borderRadius: 10,
        fontSize: 13, color: "var(--accent)",
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <span style={{ flexShrink: 0, marginTop: 1 }}>🔒</span>
        <span>
          Your PDF password is used only inside this browser tab to decrypt the file locally.
          It is <strong>never transmitted anywhere.</strong>
        </span>
      </div>

      <PdfDropZone onFiles={(files) => tools.setUnlockFile(files[0] || null)} label="Drop a password-protected PDF" />

      {tools.unlockFile && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", background: "var(--cream)",
          border: "1px solid var(--border)", borderRadius: 10,
        }}>
          <span style={{ fontSize: 13, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tools.unlockFile.name}
          </span>
          <IconBtn onClick={() => tools.setUnlockFile(null)} title="Remove">✕</IconBtn>
        </div>
      )}

      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", display: "block", marginBottom: 8 }}>
          PDF Password
        </label>
        <input
          type="password"
          value={tools.unlockPassword}
          onChange={(e) => tools.setUnlockPassword(e.target.value)}
          placeholder="Enter the PDF password"
          onKeyDown={(e) => { if (e.key === "Enter" && !isProcessing && tools.unlockFile) tools.runUnlock(); }}
          style={{
            width: "100%", padding: "10px 14px",
            border: "1.5px solid var(--border)", borderRadius: 8,
            fontSize: 14, fontFamily: "var(--sans)", color: "var(--ink)",
            background: "var(--paper)", outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <RunButton
        disabled={isProcessing || !tools.unlockFile || !tools.unlockPassword.trim()}
        onClick={tools.runUnlock}
        isProcessing={isProcessing}
        label="Unlock & download PDF →"
        disabledReason={!tools.unlockFile ? "Select a PDF first" : !tools.unlockPassword.trim() ? "Enter the password" : undefined}
      />
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: "var(--accent-light)", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--accent)",
      }}>
        {icon}
      </div>
      <div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 4, color: "var(--ink)" }}>{title}</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );
}

function PdfDropZone({ onFiles, label, multiple }: { onFiles: (files: File[]) => void; label: string; multiple?: boolean }) {
  const [dragging, setDragging] = useState(false);

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragging(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
        if (files.length) onFiles(files);
      }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "20px 24px", borderRadius: 12,
        border: dragging ? "2px dashed var(--accent)" : "1.5px dashed var(--border)",
        background: dragging ? "var(--accent-light)" : "var(--cream)",
        cursor: "pointer", fontSize: 13, color: "var(--muted)",
        transition: "all 0.15s",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dragging ? "var(--accent)" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      {label}
      <input
        type="file"
        accept="application/pdf"
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function RunButton({
  disabled, onClick, isProcessing, label, disabledReason,
}: {
  disabled: boolean;
  onClick: () => void;
  isProcessing: boolean;
  label: string;
  disabledReason?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        disabled={disabled}
        onClick={onClick}
        style={{
          background: disabled ? "var(--border)" : "var(--ink)",
          color: disabled ? "var(--muted)" : "var(--paper)",
          border: "none", padding: "12px 24px", borderRadius: 9,
          fontSize: 14, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "var(--sans)", display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.15s",
        }}
      >
        {isProcessing ? (
          <>
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
            Processing…
          </>
        ) : label}
      </button>
      {disabledReason && !isProcessing && (
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{disabledReason}</span>
      )}
    </div>
  );
}

function IconBtn({ onClick, title, children, disabled }: {
  onClick: () => void; title?: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        background: "none", border: "1px solid var(--border)", borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer", padding: "3px 6px",
        color: disabled ? "var(--border)" : "var(--muted)", fontSize: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Redact Panel (Legal) ──────────────────────────────────────────────────────

function RedactPanel({ tools, isProcessing }: { tools: ReturnType<typeof usePdfTools>; isProcessing: boolean }) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState<{ x: number; y: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewRect, setPreviewRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Draw page image + existing rects onto each canvas
  const redrawCanvas = useCallback((pageIdx: number) => {
    const rp = tools.redactPages[pageIdx];
    const canvas = canvasRefs.current[pageIdx];
    if (!rp || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(rp.canvas, 0, 0);
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    for (const r of tools.redactRects.filter((r) => r.page === rp.pageNum)) {
      ctx.fillRect(r.canvasX, r.canvasY, r.canvasWidth, r.canvasHeight);
    }
  }, [tools.redactPages, tools.redactRects]);

  const getRelativePos = (e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, pageNum: number) => {
    const canvas = e.currentTarget;
    const pos = getRelativePos(e, canvas);
    setDrawing(true);
    setStartPt(pos);
    setCurrentPage(pageNum);
    setPreviewRect(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !startPt) return;
    const canvas = e.currentTarget;
    const pos = getRelativePos(e, canvas);
    const pageIdx = tools.redactPages.findIndex((p) => p.pageNum === currentPage);
    if (pageIdx < 0) return;
    const ctx = canvas.getContext("2d")!;
    // Redraw clean
    redrawCanvas(pageIdx);
    // Draw live rect
    const x = Math.min(pos.x, startPt.x);
    const y = Math.min(pos.y, startPt.y);
    const w = Math.abs(pos.x - startPt.x);
    const h = Math.abs(pos.y - startPt.y);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    setPreviewRect({ x, y, w, h });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !startPt || !previewRect) { setDrawing(false); return; }
    const { x, y, w, h } = previewRect;
    if (w < 5 || h < 5) { setDrawing(false); setStartPt(null); setPreviewRect(null); return; }
    tools.addRedactRect({
      page: currentPage,
      x: 0, y: 0, width: 0, height: 0, // PDF space — not used for canvas-based burn
      canvasX: x, canvasY: y, canvasWidth: w, canvasHeight: h,
    });
    setDrawing(false);
    setStartPt(null);
    setPreviewRect(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        icon={<EyeOff size={18} />}
        title="PDF Redaction"
        desc="Draw black boxes over sensitive text · Burned permanently into the output · No uploads"
      />

      <div style={{
        padding: "12px 16px", background: "var(--accent-light)",
        border: "1px solid var(--accent)", borderRadius: 10,
        fontSize: 13, color: "var(--accent)",
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <span style={{ flexShrink: 0 }}>⚖️</span>
        <span>
          <strong>Legal plan feature.</strong> Redactions are applied client-side and permanently
          burned into the PDF — no metadata leakage. Your file never leaves this browser.
        </span>
      </div>

      {!tools.redactFile ? (
        <PdfDropZone onFiles={(files) => tools.setRedactFile(files[0] || null)} label="Drop a PDF to redact" />
      ) : (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", background: "var(--cream)",
            border: "1px solid var(--border)", borderRadius: 10,
          }}>
            <span style={{ fontSize: 13, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tools.redactFile.name}
            </span>
            <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, flexShrink: 0 }}>
              {tools.redactPages.length} page{tools.redactPages.length !== 1 ? "s" : ""}
            </span>
            <IconBtn onClick={() => tools.setRedactFile(null)} title="Remove">✕</IconBtn>
          </div>

          {tools.redactRects.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", background: "#fff3e0",
              border: "1px solid #ffb74d", borderRadius: 10,
              fontSize: 13, color: "#b05a2a",
            }}>
              <span>
                <strong>{tools.redactRects.length}</strong> area{tools.redactRects.length !== 1 ? "s" : ""} marked for redaction
              </span>
              <button
                onClick={tools.clearRedactRects}
                style={{
                  background: "none", border: "1px solid #ffb74d", borderRadius: 6,
                  cursor: "pointer", padding: "3px 10px", fontSize: 12,
                  color: "#b05a2a", fontFamily: "var(--sans)",
                }}
              >
                Clear all
              </button>
            </div>
          )}

          <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 -8px" }}>
            ✏️ <strong>Click and drag</strong> on any page below to mark a redaction area.
          </p>

          {/* Page canvases */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: 600, overflowY: "auto", paddingRight: 4 }}>
            {tools.redactPages.map((rp, idx) => (
              <div key={rp.pageNum} style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{
                  padding: "6px 12px", background: "var(--cream)",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 12, fontWeight: 500, color: "var(--muted)",
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span>Page {rp.pageNum}</span>
                  <span style={{ color: "var(--accent)" }}>
                    {tools.redactRects.filter((r) => r.page === rp.pageNum).length} mark{tools.redactRects.filter((r) => r.page === rp.pageNum).length !== 1 ? "s" : ""}
                  </span>
                </div>
                <canvas
                  ref={(el) => { canvasRefs.current[idx] = el; if (el) { const ctx = el.getContext("2d")!; ctx.drawImage(rp.canvas, 0, 0); redrawCanvas(idx); } }}
                  width={rp.viewportWidth}
                  height={rp.viewportHeight}
                  onMouseDown={(e) => handleMouseDown(e, rp.pageNum)}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => { if (drawing) { setDrawing(false); setStartPt(null); setPreviewRect(null); redrawCanvas(idx); } }}
                  style={{
                    width: "100%", display: "block",
                    cursor: "crosshair",
                    userSelect: "none",
                  }}
                />
              </div>
            ))}
          </div>

          <RunButton
            disabled={isProcessing || tools.redactRects.length === 0}
            onClick={tools.runRedact}
            isProcessing={isProcessing}
            label={`Apply ${tools.redactRects.length} redaction${tools.redactRects.length !== 1 ? "s" : ""} & download →`}
            disabledReason={tools.redactRects.length === 0 ? "Draw at least one redaction area above" : undefined}
          />
        </>
      )}
    </div>
  );
}

// ── Privilege Log Panel (Legal) ───────────────────────────────────────────────

function PrivilegeLogPanel({ tools, isProcessing }: { tools: ReturnType<typeof usePdfTools>; isProcessing: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        icon={<FileText size={18} />}
        title="Privilege Log Export"
        desc="Extract document entries from a PDF and export as a structured CSV · No uploads"
      />

      <div style={{
        padding: "12px 16px", background: "var(--accent-light)",
        border: "1px solid var(--accent)", borderRadius: 10,
        fontSize: 13, color: "var(--accent)",
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <span style={{ flexShrink: 0 }}>⚖️</span>
        <span>
          <strong>Legal plan feature.</strong> Reads each page of your PDF locally, extracts
          text and date/privilege keywords, and downloads a ready-to-file CSV privilege log.
        </span>
      </div>

      <PdfDropZone onFiles={(files) => tools.setPrivLogFile(files[0] || null)} label="Drop a PDF document to parse" />

      {tools.privLogFile && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", background: "var(--cream)",
          border: "1px solid var(--border)", borderRadius: 10,
        }}>
          <span style={{ fontSize: 13, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tools.privLogFile.name}
          </span>
          <IconBtn onClick={() => tools.setPrivLogFile(null)} title="Remove">✕</IconBtn>
        </div>
      )}

      {tools.privLogEntries.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{
            padding: "10px 16px", background: "var(--cream)",
            borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 12, fontWeight: 600, color: "var(--muted)",
          }}>
            <span>PREVIEW — {tools.privLogEntries.length} entries extracted</span>
            <span style={{ color: "var(--accent)", fontWeight: 500 }}>CSV downloaded automatically</span>
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--cream)", position: "sticky", top: 0 }}>
                  {["Doc #", "Date", "Privilege", "Description"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "var(--muted)", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tools.privLogEntries.slice(0, 50).map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px", color: "var(--muted)", whiteSpace: "nowrap" }}>{e.docNumber}</td>
                    <td style={{ padding: "8px 12px", color: "var(--muted)", whiteSpace: "nowrap" }}>{e.date || "—"}</td>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        background: e.privilege === "Unknown" ? "var(--cream)" : "var(--accent-light)",
                        color: e.privilege === "Unknown" ? "var(--muted)" : "var(--accent)",
                        padding: "2px 8px", borderRadius: 10,
                      }}>{e.privilege}</span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--ink)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tools.privLogEntries.length > 50 && (
            <div style={{ padding: "8px 16px", fontSize: 11, color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
              Showing first 50 of {tools.privLogEntries.length} entries — full data is in the downloaded CSV.
            </div>
          )}
        </div>
      )}

      <RunButton
        disabled={isProcessing || !tools.privLogFile}
        onClick={tools.runPrivilegeLog}
        isProcessing={isProcessing}
        label="Extract & download privilege log CSV →"
        disabledReason={!tools.privLogFile ? "Select a PDF first" : undefined}
      />
    </div>
  );
}

