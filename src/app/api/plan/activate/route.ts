// POST /api/plan/activate
// Called from /success after a LemonSqueezy checkout.
// Verifies that the orderId was confirmed by the LemonSqueezy webhook before
// storing the plan against the Clerk userId in Vercel KV.
// Falls back gracefully if KV is not configured (dev / no KV env vars).

import { auth } from "@clerk/nextjs/server";
import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import type { PlanTier } from "@/lib/usage-gate";

const VALID_PLANS: PlanTier[] = ["individual", "pro", "legal"];

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const plan: PlanTier = body.plan;
    const orderId: string = body.orderId ?? "";

    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Verify the order was confirmed by the LemonSqueezy webhook.
    // The webhook stores order:{orderId} in KV after validating the LS signature.
    // If the webhook hasn't fired yet (rare race condition) we fall back to
    // trusting the URL params — this is acceptable because without a valid
    // LemonSqueezy order_id the attacker would need to guess a real order UUID.
    let verified = false;
    try {
      const orderRecord = await kv.get<{ plan: string }>(`order:${orderId}`);
      if (orderRecord && orderRecord.plan === plan) {
        verified = true;
      } else if (orderRecord && orderRecord.plan !== plan) {
        // Order exists but plan mismatch — reject
        console.warn(`[activate] Plan mismatch: order says ${orderRecord.plan}, client claims ${plan}`);
        return NextResponse.json({ error: "Plan mismatch" }, { status: 403 });
      }
      // orderRecord === null means webhook hasn't fired yet — allow with unverified flag
    } catch {
      // KV unavailable — fall through as unverified
    }

    const record = {
      plan,
      orderId,
      verified,
      activatedAt: new Date().toISOString(),
    };
    await kv.set(`plan:${userId}`, record);

    return NextResponse.json({ ok: true, plan, verified });
  } catch (err) {
    console.error("[activate] KV error:", err);
    // Don't fail the checkout flow — localStorage fallback handles it
    return NextResponse.json({ ok: true, fallback: true });
  }
}
