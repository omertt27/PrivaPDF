// usage-gate.ts — client-side freemium limit + plan tier tracking
// Uses localStorage — easy to bypass but sufficient friction for honest users.
// Plan is set locally after a successful LemonSqueezy checkout redirect.

const STORAGE_KEY  = "pdfconvert_usage";
const PLAN_KEY     = "pdfconvert_plan";      // "free" | "individual" | "pro" | "legal"
const SESSION_KEY  = "pdfconvert_session";
const DAILY_FREE_LIMIT = 3;

export type PlanTier = "free" | "individual" | "pro" | "legal";

// Plan metadata — single source of truth used across the app
export const PLAN_META: Record<PlanTier, { label: string; color: string; badge: string }> = {
  free:       { label: "Free",       color: "var(--muted)",  badge: "Free" },
  individual: { label: "Individual", color: "var(--accent)", badge: "Individual — Unlimited" },
  pro:        { label: "Pro",        color: "#8db89a",       badge: "Pro — Unlimited" },
  legal:      { label: "Legal ⚖️",  color: "var(--accent)", badge: "Legal — Unlimited" },
};

// Features unlocked per tier (cumulative)
export const PLAN_FEATURES: Record<PlanTier, readonly string[]> = {
  free:       [],
  individual: ["unlimited", "ocr", "xlsx", "pptx", "batch"],
  pro:        ["unlimited", "ocr", "xlsx", "pptx", "batch"],
  legal:      ["unlimited", "ocr", "xlsx", "pptx", "batch", "redaction", "advanced_ocr"],
};

interface UsageRecord {
  [date: string]: number;
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Plan reads ───────────────────────────────────────────────────────────────

export function getPlan(): PlanTier {
  try {
    const stored = localStorage.getItem(PLAN_KEY) as PlanTier | null;
    if (stored && stored in PLAN_META) return stored;
  } catch { /* ignore */ }
  return "free";
}

export function isPaidPlan(): boolean {
  return getPlan() !== "free";
}

/** @deprecated use getPlan() instead */
export function isProUser(): boolean {
  return isPaidPlan();
}

export function hasFeature(feature: string): boolean {
  return (PLAN_FEATURES[getPlan()] as readonly string[]).includes(feature);
}

// ─── Usage counting (free tier only) ─────────────────────────────────────────

export function getRemainingConversions(): number {
  if (isPaidPlan()) return Infinity;
  try {
    const data: UsageRecord = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const used = data[getTodayKey()] || 0;
    return Math.max(0, DAILY_FREE_LIMIT - used);
  } catch {
    return DAILY_FREE_LIMIT;
  }
}

export function consumeConversion(): boolean {
  if (isPaidPlan()) return true;
  try {
    const data: UsageRecord = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const today = getTodayKey();
    const used = data[today] || 0;
    if (used >= DAILY_FREE_LIMIT) return false;

    data[today] = used + 1;
    // Clean up dates older than 7 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    for (const key of Object.keys(data)) {
      if (new Date(key) < cutoff) delete data[key];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return true; // fail open
  }
}

// ─── Plan activation (called from /success page after LemonSqueezy redirect) ──

export function activatePlan(plan: PlanTier, sessionId: string): void {
  try {
    localStorage.setItem(PLAN_KEY, plan);
    localStorage.setItem(SESSION_KEY, sessionId);
    // Legacy compat key — keep so any existing code using isProUser() still works
    localStorage.setItem("pdfconvert_pro", plan !== "free" ? "true" : "false");
  } catch { /* ignore */ }
}

/** @deprecated use activatePlan() instead */
export function activateProAccess(sessionId: string): void {
  activatePlan("pro", sessionId);
}

export const DAILY_LIMIT = DAILY_FREE_LIMIT;
