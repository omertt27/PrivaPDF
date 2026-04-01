// POST /api/email-capture
// Persists an email address submitted via EmailCaptureModal to Vercel KV.
// Emails are stored in a sorted set keyed by submission timestamp.
// Fails silently — the modal already saves to localStorage as a fallback.
//
// To export collected emails:
//   kv.zrange("captured_emails", 0, -1)   (ascending by time)

import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email ?? "").toString().trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // zadd with NX so duplicate emails don't overwrite the original timestamp
    await kv.zadd("captured_emails", { nx: true }, {
      score: Date.now(),
      member: email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email-capture] error:", err);
    // Fail silently — localStorage already saved the email on the client
    return NextResponse.json({ ok: true, fallback: true });
  }
}
