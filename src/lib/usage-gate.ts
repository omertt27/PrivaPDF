// usage-gate.ts — client-side freemium limit
// Uses localStorage — easy to bypass but sufficient friction for honest users
// For a paid upgrade, replace with a server-side check tied to a Stripe session

const STORAGE_KEY = "pdfconvert_usage";
const DAILY_FREE_LIMIT = 3;

interface UsageRecord {
  [date: string]: number;
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0]; // "2026-03-30"
}

export function getRemainingConversions(): number {
  try {
    const data: UsageRecord = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const today = getTodayKey();
    const used = data[today] || 0;
    return Math.max(0, DAILY_FREE_LIMIT - used);
  } catch {
    return DAILY_FREE_LIMIT;
  }
}

export function consumeConversion(): boolean {
  try {
    const data: UsageRecord = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const today = getTodayKey();
    const used = data[today] || 0;

    if (used >= DAILY_FREE_LIMIT) return false; // limit reached

    data[today] = used + 1;

    // Clean up old dates (keep only last 7 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    for (const key of Object.keys(data)) {
      if (new Date(key) < cutoff) delete data[key];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return true; // fail open — don't block user on storage errors
  }
}

export function isProUser(): boolean {
  try {
    return localStorage.getItem("pdfconvert_pro") === "true";
  } catch {
    return false;
  }
}

// Called after successful Stripe checkout redirect
export function activateProAccess(sessionId: string): void {
  try {
    localStorage.setItem("pdfconvert_pro", "true");
    localStorage.setItem("pdfconvert_session", sessionId);
  } catch {
    // ignore
  }
}

export const DAILY_LIMIT = DAILY_FREE_LIMIT;
