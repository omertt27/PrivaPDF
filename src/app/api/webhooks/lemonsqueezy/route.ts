// POST /api/webhooks/lemonsqueezy
// Receives order events from LemonSqueezy (server-to-server).
// Validates the X-Signature HMAC-SHA256 header, then stores a verified
// order record in Vercel KV so /api/plan/activate can confirm it.
//
// Required env var: LEMONSQUEEZY_WEBHOOK_SECRET
// Set this in LemonSqueezy → Settings → Webhooks → Signing secret.
//
// The checkout URLs must embed ?checkout[custom][plan]=<tier> so this
// handler knows which plan tier to associate with the order.

import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import crypto from "crypto";

const SIGNING_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";

async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  if (!SIGNING_SECRET) {
    console.warn("[ls-webhook] LEMONSQUEEZY_WEBHOOK_SECRET is not set — skipping signature check");
    return false;
  }
  try {
    const hmac = crypto.createHmac("sha256", SIGNING_SECRET);
    const digest = hmac.update(rawBody).digest("hex");
    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(digest, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("x-signature") ?? "";
  const rawBody = await req.text();

  if (!(await verifySignature(rawBody, signature))) {
    console.error("[ls-webhook] Invalid or missing signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const meta = payload.meta as Record<string, unknown> | undefined;
  const eventName = meta?.event_name as string | undefined;

  // Only process completed orders
  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Plan tier is embedded via checkout[custom][plan]=<tier> in the buy URL
  const customData = meta?.custom_data as Record<string, string> | undefined;
  const plan = customData?.plan as string | undefined;

  const data = payload.data as Record<string, unknown> | undefined;
  const orderId = String(data?.id ?? "");
  const attributes = data?.attributes as Record<string, unknown> | undefined;
  const customerEmail = attributes?.user_email as string | undefined;

  const validPlans = ["individual", "pro", "legal"];
  if (!plan || !validPlans.includes(plan) || !orderId) {
    console.error("[ls-webhook] Missing or invalid plan/orderId in webhook payload", { plan, orderId, eventName });
    // Still return 200 so LemonSqueezy doesn't retry indefinitely
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    // Store verified order — expires after 1 year (orders don't expire)
    await kv.set(
      `order:${orderId}`,
      { plan, email: customerEmail ?? null, validatedAt: new Date().toISOString() },
      { ex: 60 * 60 * 24 * 365 }
    );
    console.log(`[ls-webhook] Stored verified order ${orderId} → plan:${plan}`);
  } catch (err) {
    console.error("[ls-webhook] KV write failed:", err);
    // Return 200 anyway — the order will be re-sent on next retry
  }

  return NextResponse.json({ ok: true });
}
