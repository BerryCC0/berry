/**
 * BIM Push Notifications API
 * POST   /api/bim/push  → Subscribe to push notifications
 * DELETE /api/bim/push  → Unsubscribe from push notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { addPushSubscription, removePushSubscription } from "@/app/lib/bim/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, endpoint, p256dh_key, auth_key } = body;

    if (!wallet || !endpoint || !p256dh_key || !auth_key) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await addPushSubscription(wallet, endpoint, p256dh_key, auth_key);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[BIM API] Failed to subscribe:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, endpoint } = body;

    if (!wallet || !endpoint) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await removePushSubscription(wallet, endpoint);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[BIM API] Failed to unsubscribe:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
