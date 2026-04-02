/**
 * plan-api.test.ts
 *
 * Tests for the three plan API routes:
 *   POST /api/plan/activate  — verifies order → stores plan in KV
 *   GET  /api/plan/get       — restores plan for a signed-in user
 *   POST /api/webhooks/lemonsqueezy — HMAC validation + order storage
 */

import crypto from "crypto";

// ─── Mock @vercel/kv ──────────────────────────────────────────────────────────

const kvStore = new Map<string, unknown>();

jest.mock("@vercel/kv", () => ({
  kv: {
    get: jest.fn(async (key: string) => kvStore.get(key) ?? null),
    set: jest.fn(async (key: string, value: unknown) => { kvStore.set(key, value); }),
  },
}));

// ─── Mock @clerk/nextjs/server ────────────────────────────────────────────────

let mockUserId: string | null = "user_abc";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(async () => ({ userId: mockUserId })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/plan/activate", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(): Request {
  return new Request("http://localhost/api/plan/get", { method: "GET" });
}

function makeWebhookRequest(payload: unknown, secret: string): Request {
  const body = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return new Request("http://localhost/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": hmac,
    },
    body,
  });
}

// ─── /api/plan/activate ───────────────────────────────────────────────────────

describe("POST /api/plan/activate", () => {
  // Lazy-load so mocks are in place first
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const getHandler = () => require("../plan/activate/route").POST as (r: Request) => Promise<Response>;

  beforeEach(() => {
    kvStore.clear();
    mockUserId = "user_abc";
    jest.resetModules();
  });

  it("returns 401 when user is not signed in", async () => {
    mockUserId = null;
    const { POST } = await import("../plan/activate/route");
    const res = await POST(makeRequest({ plan: "pro", orderId: "ord_1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid plan tier", async () => {
    const { POST } = await import("../plan/activate/route");
    const res = await POST(makeRequest({ plan: "enterprise", orderId: "ord_1" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when KV order plan mismatches the claimed plan", async () => {
    kvStore.set("order:ord_mismatch", { plan: "individual", email: null, validatedAt: new Date().toISOString() });
    const { POST } = await import("../plan/activate/route");
    const res = await POST(makeRequest({ plan: "legal", orderId: "ord_mismatch" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Plan mismatch");
  });

  it("activates and stores 'individual' plan when KV order matches", async () => {
    kvStore.set("order:ord_ind", { plan: "individual", email: "a@b.com", validatedAt: new Date().toISOString() });
    const { POST } = await import("../plan/activate/route");
    const res = await POST(makeRequest({ plan: "individual", orderId: "ord_ind" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.plan).toBe("individual");
    expect(body.verified).toBe(true);
    // Should have written plan:user_abc to KV
    const stored = kvStore.get("plan:user_abc") as Record<string, unknown>;
    expect(stored.plan).toBe("individual");
    expect(stored.orderId).toBe("ord_ind");
    expect(stored.verified).toBe(true);
  });

  it("activates 'pro' plan when KV order matches", async () => {
    kvStore.set("order:ord_pro", { plan: "pro", email: "pro@b.com", validatedAt: new Date().toISOString() });
    const { POST } = await import("../plan/activate/route");
    const res = await POST(makeRequest({ plan: "pro", orderId: "ord_pro" }));
    const body = await res.json();
    expect(body.plan).toBe("pro");
    expect(body.verified).toBe(true);
  });

  it("activates 'legal' plan when KV order matches", async () => {
    kvStore.set("order:ord_legal", { plan: "legal", email: "law@firm.com", validatedAt: new Date().toISOString() });
    const { POST } = await import("../plan/activate/route");
    const res = await POST(makeRequest({ plan: "legal", orderId: "ord_legal" }));
    const body = await res.json();
    expect(body.plan).toBe("legal");
    expect(body.verified).toBe(true);
  });

  it("stores unverified=false when order is not yet in KV (webhook race)", async () => {
    // Order not in KV yet — webhook hasn't fired
    const { POST } = await import("../plan/activate/route");
    const res = await POST(makeRequest({ plan: "pro", orderId: "ord_race" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.verified).toBe(false); // not verified but not blocked
  });

  void getHandler; // suppress unused warning
});

// ─── /api/plan/get ────────────────────────────────────────────────────────────

describe("GET /api/plan/get", () => {
  beforeEach(() => {
    kvStore.clear();
    mockUserId = "user_abc";
    jest.resetModules();
  });

  it("returns free plan when user is not signed in", async () => {
    mockUserId = null;
    const { GET } = await import("../plan/get/route");
    const res = await GET();
    const body = await res.json();
    expect(body.plan).toBe("free");
  });

  it("returns free plan when no KV record exists", async () => {
    const { GET } = await import("../plan/get/route");
    const res = await GET();
    const body = await res.json();
    expect(body.plan).toBe("free");
  });

  it("returns the stored plan and orderId for a paid user", async () => {
    kvStore.set("plan:user_abc", { plan: "pro", orderId: "ord_pro_restored", activatedAt: new Date().toISOString() });
    const { GET } = await import("../plan/get/route");
    const res = await GET();
    const body = await res.json();
    expect(body.plan).toBe("pro");
    expect(body.orderId).toBe("ord_pro_restored");
  });

  it("returns 'individual' plan correctly", async () => {
    kvStore.set("plan:user_abc", { plan: "individual", orderId: "ord_ind_r", activatedAt: new Date().toISOString() });
    const { GET } = await import("../plan/get/route");
    const res = await GET();
    const body = await res.json();
    expect(body.plan).toBe("individual");
  });

  it("returns 'legal' plan correctly", async () => {
    kvStore.set("plan:user_abc", { plan: "legal", orderId: "ord_legal_r", activatedAt: new Date().toISOString() });
    const { GET } = await import("../plan/get/route");
    const res = await GET();
    const body = await res.json();
    expect(body.plan).toBe("legal");
  });
});

// ─── /api/webhooks/lemonsqueezy ───────────────────────────────────────────────

describe("POST /api/webhooks/lemonsqueezy", () => {
  const SECRET = "test_webhook_secret";

  beforeEach(() => {
    kvStore.clear();
    jest.resetModules();
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = SECRET;
  });

  function buildOrderPayload(plan: string, orderId: string, email = "buyer@test.com") {
    return {
      meta: {
        event_name: "order_created",
        custom_data: { plan },
      },
      data: {
        id: orderId,
        attributes: {
          user_email: email,
          status: "paid",
        },
      },
    };
  }

  it("returns 401 for a missing or wrong signature", async () => {
    const { POST } = await import("../webhooks/lemonsqueezy/route");
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-signature": "badsig" },
      body: JSON.stringify(buildOrderPayload("pro", "ord_x")),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("stores the verified order in KV for 'individual' purchase", async () => {
    const { POST } = await import("../webhooks/lemonsqueezy/route");
    const payload = buildOrderPayload("individual", "ord_ind_wh", "ind@buyer.com");
    const res = await POST(makeWebhookRequest(payload, SECRET));
    expect(res.status).toBe(200);
    const stored = kvStore.get("order:ord_ind_wh") as Record<string, unknown>;
    expect(stored).not.toBeNull();
    expect(stored.plan).toBe("individual");
    expect(stored.email).toBe("ind@buyer.com");
  });

  it("stores the verified order in KV for 'pro' purchase", async () => {
    const { POST } = await import("../webhooks/lemonsqueezy/route");
    const payload = buildOrderPayload("pro", "ord_pro_wh", "pro@buyer.com");
    const res = await POST(makeWebhookRequest(payload, SECRET));
    expect(res.status).toBe(200);
    const stored = kvStore.get("order:ord_pro_wh") as Record<string, unknown>;
    expect(stored.plan).toBe("pro");
  });

  it("stores the verified order in KV for 'legal' purchase", async () => {
    const { POST } = await import("../webhooks/lemonsqueezy/route");
    const payload = buildOrderPayload("legal", "ord_legal_wh", "lawyer@firm.com");
    const res = await POST(makeWebhookRequest(payload, SECRET));
    expect(res.status).toBe(200);
    const stored = kvStore.get("order:ord_legal_wh") as Record<string, unknown>;
    expect(stored.plan).toBe("legal");
    expect(stored.email).toBe("lawyer@firm.com");
  });

  it("skips (200, no KV write) for non-order events", async () => {
    const { POST } = await import("../webhooks/lemonsqueezy/route");
    const payload = {
      meta: { event_name: "subscription_cancelled", custom_data: { plan: "pro" } },
      data: { id: "ord_skip", attributes: { user_email: "x@x.com" } },
    };
    const res = await POST(makeWebhookRequest(payload, SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(kvStore.has("order:ord_skip")).toBe(false);
  });

  it("skips (200) for unknown plan in payload", async () => {
    const { POST } = await import("../webhooks/lemonsqueezy/route");
    const payload = buildOrderPayload("hacker_plan", "ord_evil");
    const res = await POST(makeWebhookRequest(payload, SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(kvStore.has("order:ord_evil")).toBe(false);
  });
});
