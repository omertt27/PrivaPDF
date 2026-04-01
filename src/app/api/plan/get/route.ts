// GET /api/plan/get
// Called client-side after sign-in to restore the user's plan on a new device.
// Returns { plan, orderId } or { plan: "free" } if no record found.

import { auth } from "@clerk/nextjs/server";
import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ plan: "free" });
    }

    const record = await kv.get<{ plan: string; orderId: string; activatedAt: string }>(
      `plan:${userId}`
    );

    if (!record) {
      return NextResponse.json({ plan: "free" });
    }

    return NextResponse.json({ plan: record.plan, orderId: record.orderId });
  } catch (err) {
    console.error("[get-plan] KV error:", err);
    // Fail open — client will use localStorage cache
    return NextResponse.json({ plan: "free", fallback: true });
  }
}
