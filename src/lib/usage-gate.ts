// usage-gate.ts — client-side freemium limit + plan tier tracking
// Uses localStorage — easy to bypass but sufficient friction for honest users.
// Plan is set locally after a successful LemonSqueezy checkout redirect.

const STORAGE_KEY       = "pdfconvert_usage";
const TOOLS_STORAGE_KEY = "pdfconvert_tools_usage";
const PLAN_KEY          = "pdfconvert_plan";      // "free" | "individual" | "pro" | "legal"
const SESSION_KEY       = "pdfconvert_session";
const TRIAL_KEY         = "pdfconvert_trial_start"; // ISO date string
const EMAIL_KEY         = "pdfconvert_email";
const DAILY_FREE_LIMIT       = 3;
const DAILY_FREE_TOOLS_LIMIT = 3;
const TRIAL_DAYS             = 7;

// ─── Temporary public feature flags ───────────────────────────────────────────
// Features listed here are treated as available to ALL users (including free)
// until their `until` date. After that date they revert to normal plan gating.
// To open a feature: add an entry. To close it: remove the entry or let it expire.
//
// Available feature keys: "ocr" | "xlsx" | "pptx" | "batch" | "page_range"
//                         | "lock" | "sign" | "unlimited"
//
// Example — open OCR and batch to everyone until July 1 2026:
//   ocr:   { until: "2026-07-01" },
//   batch: { until: "2026-07-01" },
//
const PUBLIC_FEATURE_FLAGS: Partial<Record<string, { until: string }>> = {
  // Open to all users until 2026-07-04 (3-month public beta)
  // To close early: delete or comment out the entry you want to revert.
  // Legal-only features (redaction, advanced_ocr, privilege_log) are intentionally excluded.
  unlimited:  { until: "2026-07-04" }, // lifts the 3-conversions/day limit
  ocr:        { until: "2026-07-04" }, // AI OCR for scanned PDFs
  xlsx:       { until: "2026-07-04" }, // PDF → Excel export
  pptx:       { until: "2026-07-04" }, // PDF → PowerPoint export
  batch:      { until: "2026-07-04" }, // batch convert multiple PDFs
  page_range: { until: "2026-07-04" }, // select specific pages to convert
  lock:       { until: "2026-07-04" }, // password-protect PDFs locally
  sign:       { until: "2026-07-04" }, // sign PDFs locally
};

/** Returns true if a feature is currently open to all users via a public flag. */
function isPublicFeature(feature: string): boolean {
  const flag = _publicFlags[feature];
  if (!flag) return false;
  return new Date() < new Date(flag.until);
}

// Internal reference — can be overridden in tests via __setPublicFlagsForTesting
let _publicFlags: Partial<Record<string, { until: string }>> = PUBLIC_FEATURE_FLAGS;

/** @internal — test-only escape hatch to override public flags without touching the source. */
export function __setPublicFlagsForTesting(
  flags: Partial<Record<string, { until: string }>>
): void {
  _publicFlags = flags;
}

/** @internal — restores the real PUBLIC_FEATURE_FLAGS after a test override. */
export function __resetPublicFlagsForTesting(): void {
  _publicFlags = PUBLIC_FEATURE_FLAGS;
}

export type PlanTier = "free" | "individual" | "pro" | "legal";

// Plan metadata — single source of truth used across the app
export const PLAN_META: Record<PlanTier, { label: string; color: string; badge: string }> = {
  free:       { label: "Free",       color: "var(--muted)",  badge: "Free" },
  individual: { label: "Individual", color: "var(--accent)", badge: "Individual — Unlimited" },
  pro:        { label: "Pro",        color: "#8db89a",       badge: "Pro — Unlimited" },
  legal:      { label: "Legal ⚖️",  color: "var(--accent)", badge: "Legal — Unlimited" },
};

// Features unlocked per tier (cumulative)
// free: PDF→DOCX + TXT (3/day), Merge/Split/Compress/Unlock (3/day)
// individual: everything in free + unlimited + ocr + xlsx + pptx + batch + page_range
// pro: everything in individual + priority support features
// legal: everything in pro + redaction + advanced_ocr + privilege_log
export const PLAN_FEATURES: Record<PlanTier, readonly string[]> = {
  free:       [],
  individual: ["unlimited", "ocr", "xlsx", "pptx", "batch", "page_range"],
  pro:        ["unlimited", "ocr", "xlsx", "pptx", "batch", "page_range"],
  legal:      ["unlimited", "ocr", "xlsx", "pptx", "batch", "page_range", "redaction", "advanced_ocr", "privilege_log"],
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
  if (isPublicFeature("unlimited")) return true;
  return getPlan() !== "free";
}

/** @deprecated use getPlan() instead */
export function isProUser(): boolean {
  return isPaidPlan();
}

export function hasFeature(feature: string): boolean {
  if (isPublicFeature(feature)) return true;
  return (PLAN_FEATURES[getPlan()] as readonly string[]).includes(feature);
}

// ─── Usage counting (free tier only) ─────────────────────────────────────────

export function getRemainingConversions(): number {
  if (isPaidPlan()) return Infinity;
  try {
    const data: UsageRecord = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const used = data[getTodayKey()] || 0;
    return Math.max(0, getDailyLimit() - used);
  } catch {
    return getDailyLimit();
  }
}

export function consumeConversion(): boolean {
  if (isPaidPlan()) return true;
  try {
    const data: UsageRecord = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const today = getTodayKey();
    const used = data[today] || 0;
    const limit = getDailyLimit();
    if (used >= limit) return false;

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

// ─── Tool usage counting (free tier: merge/split/compress/unlock) ─────────────

export function getRemainingToolUses(): number {
  if (isPaidPlan()) return Infinity;
  try {
    const data: UsageRecord = JSON.parse(localStorage.getItem(TOOLS_STORAGE_KEY) || "{}");
    const used = data[getTodayKey()] || 0;
    return Math.max(0, DAILY_FREE_TOOLS_LIMIT - used);
  } catch {
    return DAILY_FREE_TOOLS_LIMIT;
  }
}

export function consumeToolUse(): boolean {
  if (isPaidPlan()) return true;
  try {
    const data: UsageRecord = JSON.parse(localStorage.getItem(TOOLS_STORAGE_KEY) || "{}");
    const today = getTodayKey();
    const used = data[today] || 0;
    if (used >= DAILY_FREE_TOOLS_LIMIT) return false;

    data[today] = used + 1;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    for (const key of Object.keys(data)) {
      if (new Date(key) < cutoff) delete data[key];
    }
    localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify(data));
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

// ─── Trial period ──────────────────────────────────────────────────────────────

/**
 * Starts a free trial (stored locally). Called when the user first opens the app.
 * Safe to call multiple times — only sets the key if it doesn't exist yet.
 */
export function maybeStartTrial(): void {
  try {
    if (!localStorage.getItem(TRIAL_KEY)) {
      localStorage.setItem(TRIAL_KEY, new Date().toISOString());
    }
  } catch { /* ignore */ }
}

/**
 * Returns the number of trial days remaining (0 if expired or never started).
 * Only relevant for free users.
 */
export function getTrialDaysLeft(): number {
  if (isPaidPlan()) return 0;
  try {
    const start = localStorage.getItem(TRIAL_KEY);
    if (!start) return 0;
    const started = new Date(start);
    const elapsed = (Date.now() - started.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
  } catch {
    return 0;
  }
}

/**
 * During the trial window, free users get an extra +2 conversions/day (total 5).
 */
export function getDailyLimit(): number {
  if (isPaidPlan()) return Infinity;
  const daysLeft = getTrialDaysLeft();
  return daysLeft > 0 ? DAILY_FREE_LIMIT + 2 : DAILY_FREE_LIMIT;
}

// ─── Public flag introspection (for UI banners) ────────────────────────────────

/**
 * Returns an array of features currently open to all users via PUBLIC_FEATURE_FLAGS,
 * along with their expiry date. Useful for rendering "Free during beta" banners.
 *
 * Example usage:
 *   const active = getActivePublicFlags();
 *   // [{ feature: "ocr", until: "2026-07-01" }, ...]
 */
export function getActivePublicFlags(): { feature: string; until: string }[] {
  return Object.entries(_publicFlags)
    .filter(([feature]) => isPublicFeature(feature))
    .map(([feature, flag]) => ({ feature, until: flag!.until }));
}

// ─── Email capture ─────────────────────────────────────────────────────────────

export function getCapturedEmail(): string | null {
  try { return localStorage.getItem(EMAIL_KEY); } catch { return null; }
}

export function setCapturedEmail(email: string): void {
  try { localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase()); } catch { /* ignore */ }
}

export function hasCapturedEmail(): boolean {
  return !!getCapturedEmail();
}
