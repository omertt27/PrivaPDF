/**
 * usage-gate.test.ts
 *
 * Tests that each plan tier unlocks exactly the features advertised,
 * and that free-tier limits are enforced correctly.
 */

import {
  getPlan,
  activatePlan,
  hasFeature,
  isPaidPlan,
  getRemainingConversions,
  consumeConversion,
  getRemainingToolUses,
  consumeToolUse,
  getDailyLimit,
  PLAN_FEATURES,
  PLAN_META,
  type PlanTier,
} from "../usage-gate";

// ─── localStorage mock ────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

// ─── PLAN_META completeness ───────────────────────────────────────────────────

describe("PLAN_META", () => {
  const tiers: PlanTier[] = ["free", "individual", "pro", "legal"];

  it("has an entry for every tier", () => {
    tiers.forEach((t) => expect(PLAN_META[t]).toBeDefined());
  });

  it("every tier has a non-empty label, color and badge", () => {
    tiers.forEach((t) => {
      expect(PLAN_META[t].label.length).toBeGreaterThan(0);
      expect(PLAN_META[t].color.length).toBeGreaterThan(0);
      expect(PLAN_META[t].badge.length).toBeGreaterThan(0);
    });
  });
});

// ─── getPlan defaults ─────────────────────────────────────────────────────────

describe("getPlan()", () => {
  it("returns 'free' when nothing is stored", () => {
    expect(getPlan()).toBe("free");
  });

  it("returns 'free' for an invalid stored value", () => {
    localStorage.setItem("pdfconvert_plan", "hacker_plan");
    expect(getPlan()).toBe("free");
  });
});

// ─── activatePlan ─────────────────────────────────────────────────────────────

describe("activatePlan()", () => {
  const paid: PlanTier[] = ["individual", "pro", "legal"];

  paid.forEach((tier) => {
    it(`activating '${tier}' makes getPlan() return '${tier}'`, () => {
      activatePlan(tier, "order_123");
      expect(getPlan()).toBe(tier);
    });

    it(`activating '${tier}' makes isPaidPlan() return true`, () => {
      activatePlan(tier, "order_123");
      expect(isPaidPlan()).toBe(true);
    });
  });

  it("free plan makes isPaidPlan() return false", () => {
    activatePlan("free", "");
    expect(isPaidPlan()).toBe(false);
  });
});

// ─── Feature gates — what each plan unlocks ───────────────────────────────────

describe("hasFeature() — free plan", () => {
  beforeEach(() => activatePlan("free", ""));

  it("does NOT have 'unlimited'", () => expect(hasFeature("unlimited")).toBe(false));
  it("does NOT have 'ocr'",       () => expect(hasFeature("ocr")).toBe(false));
  it("does NOT have 'xlsx'",      () => expect(hasFeature("xlsx")).toBe(false));
  it("does NOT have 'pptx'",      () => expect(hasFeature("pptx")).toBe(false));
  it("does NOT have 'batch'",     () => expect(hasFeature("batch")).toBe(false));
  it("does NOT have 'redaction'", () => expect(hasFeature("redaction")).toBe(false));
});

describe("hasFeature() — individual plan", () => {
  beforeEach(() => activatePlan("individual", "order_ind"));

  it("has 'unlimited'",    () => expect(hasFeature("unlimited")).toBe(true));
  it("has 'ocr'",          () => expect(hasFeature("ocr")).toBe(true));
  it("has 'xlsx'",         () => expect(hasFeature("xlsx")).toBe(true));
  it("has 'pptx'",         () => expect(hasFeature("pptx")).toBe(true));
  it("has 'batch'",        () => expect(hasFeature("batch")).toBe(true));
  it("has 'page_range'",   () => expect(hasFeature("page_range")).toBe(true));
  it("does NOT have 'redaction'",    () => expect(hasFeature("redaction")).toBe(false));
  it("does NOT have 'advanced_ocr'", () => expect(hasFeature("advanced_ocr")).toBe(false));
  it("does NOT have 'privilege_log'",() => expect(hasFeature("privilege_log")).toBe(false));
});

describe("hasFeature() — pro plan", () => {
  beforeEach(() => activatePlan("pro", "order_pro"));

  it("has 'unlimited'",  () => expect(hasFeature("unlimited")).toBe(true));
  it("has 'ocr'",        () => expect(hasFeature("ocr")).toBe(true));
  it("has 'xlsx'",       () => expect(hasFeature("xlsx")).toBe(true));
  it("has 'pptx'",       () => expect(hasFeature("pptx")).toBe(true));
  it("has 'batch'",      () => expect(hasFeature("batch")).toBe(true));
  it("has 'page_range'", () => expect(hasFeature("page_range")).toBe(true));
  it("does NOT have 'redaction'",    () => expect(hasFeature("redaction")).toBe(false));
  it("does NOT have 'advanced_ocr'", () => expect(hasFeature("advanced_ocr")).toBe(false));
});

describe("hasFeature() — legal plan (top tier)", () => {
  beforeEach(() => activatePlan("legal", "order_legal"));

  it("has 'unlimited'",      () => expect(hasFeature("unlimited")).toBe(true));
  it("has 'ocr'",            () => expect(hasFeature("ocr")).toBe(true));
  it("has 'xlsx'",           () => expect(hasFeature("xlsx")).toBe(true));
  it("has 'pptx'",           () => expect(hasFeature("pptx")).toBe(true));
  it("has 'batch'",          () => expect(hasFeature("batch")).toBe(true));
  it("has 'page_range'",     () => expect(hasFeature("page_range")).toBe(true));
  it("has 'redaction'",      () => expect(hasFeature("redaction")).toBe(true));
  it("has 'advanced_ocr'",   () => expect(hasFeature("advanced_ocr")).toBe(true));
  it("has 'privilege_log'",  () => expect(hasFeature("privilege_log")).toBe(true));
});

// ─── PLAN_FEATURES internal consistency ──────────────────────────────────────

describe("PLAN_FEATURES internal consistency", () => {
  it("individual features are a subset of legal features", () => {
    const indFeatures = PLAN_FEATURES.individual;
    indFeatures.forEach((f) =>
      expect(PLAN_FEATURES.legal).toContain(f)
    );
  });

  it("pro features are a subset of legal features", () => {
    PLAN_FEATURES.pro.forEach((f) =>
      expect(PLAN_FEATURES.legal).toContain(f)
    );
  });

  it("legal has more features than pro", () => {
    expect(PLAN_FEATURES.legal.length).toBeGreaterThan(PLAN_FEATURES.pro.length);
  });

  it("legal has more features than individual", () => {
    expect(PLAN_FEATURES.legal.length).toBeGreaterThan(PLAN_FEATURES.individual.length);
  });
});

// ─── Free-tier daily conversion limit ────────────────────────────────────────

describe("Free tier conversion limits", () => {
  beforeEach(() => activatePlan("free", ""));

  it("starts with the full daily limit (3 outside trial)", () => {
    // No trial key set → getTrialDaysLeft() = 0 → limit = 3
    expect(getRemainingConversions()).toBe(3);
  });

  it("decrements remaining count on each consumeConversion()", () => {
    expect(consumeConversion()).toBe(true);
    expect(getRemainingConversions()).toBe(2);
    expect(consumeConversion()).toBe(true);
    expect(getRemainingConversions()).toBe(1);
  });

  it("blocks the 4th conversion (returns false)", () => {
    consumeConversion();
    consumeConversion();
    consumeConversion();
    expect(consumeConversion()).toBe(false);
    expect(getRemainingConversions()).toBe(0);
  });
});

// ─── Paid plans bypass daily limit ───────────────────────────────────────────

describe("Paid plans have unlimited conversions", () => {
  const paid: PlanTier[] = ["individual", "pro", "legal"];

  paid.forEach((tier) => {
    it(`${tier} — getRemainingConversions() returns Infinity`, () => {
      activatePlan(tier, "order_test");
      expect(getRemainingConversions()).toBe(Infinity);
    });

    it(`${tier} — consumeConversion() always returns true`, () => {
      activatePlan(tier, "order_test");
      for (let i = 0; i < 20; i++) {
        expect(consumeConversion()).toBe(true);
      }
    });
  });
});

// ─── Free-tier tool usage limit ──────────────────────────────────────────────

describe("Free tier tool limits", () => {
  beforeEach(() => activatePlan("free", ""));

  it("starts with 3 tool uses", () => {
    expect(getRemainingToolUses()).toBe(3);
  });

  it("decrements on each consumeToolUse()", () => {
    consumeToolUse();
    expect(getRemainingToolUses()).toBe(2);
    consumeToolUse();
    expect(getRemainingToolUses()).toBe(1);
  });

  it("blocks the 4th tool use", () => {
    consumeToolUse();
    consumeToolUse();
    consumeToolUse();
    expect(consumeToolUse()).toBe(false);
    expect(getRemainingToolUses()).toBe(0);
  });
});

// ─── Paid plans bypass tool limit ────────────────────────────────────────────

describe("Paid plans have unlimited tool uses", () => {
  const paid: PlanTier[] = ["individual", "pro", "legal"];

  paid.forEach((tier) => {
    it(`${tier} — getRemainingToolUses() returns Infinity`, () => {
      activatePlan(tier, "order_test");
      expect(getRemainingToolUses()).toBe(Infinity);
    });

    it(`${tier} — consumeToolUse() always returns true`, () => {
      activatePlan(tier, "order_test");
      for (let i = 0; i < 10; i++) {
        expect(consumeToolUse()).toBe(true);
      }
    });
  });
});

// ─── Trial bonus ──────────────────────────────────────────────────────────────

describe("Trial period bonus conversions", () => {
  beforeEach(() => {
    activatePlan("free", "");
    // Simulate an active trial started today
    localStorage.setItem("pdfconvert_trial_start", new Date().toISOString());
  });

  it("gives 5 conversions/day during trial (3 base + 2 bonus)", () => {
    expect(getDailyLimit()).toBe(5);
    expect(getRemainingConversions()).toBe(5);
  });

  it("allows 5 conversions before blocking", () => {
    for (let i = 0; i < 5; i++) {
      expect(consumeConversion()).toBe(true);
    }
    expect(consumeConversion()).toBe(false);
  });

  it("gives only 3 conversions/day after trial has expired", () => {
    const expired = new Date();
    expired.setDate(expired.getDate() - 8); // 8 days ago
    localStorage.setItem("pdfconvert_trial_start", expired.toISOString());
    expect(getDailyLimit()).toBe(3);
    expect(getRemainingConversions()).toBe(3);
  });
});
