/**
 * BIM Profile API
 * GET  /api/bim/profile?wallet=0x...   → Get user profile
 * PUT  /api/bim/profile                → Update user profile
 */

import { NextRequest, NextResponse } from "next/server";
import { getProfile, upsertProfile } from "@/app/lib/bim/db";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet parameter required" }, { status: 400 });
  }

  try {
    const profile = await getProfile(wallet);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[BIM API] Failed to get profile:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, display_name, avatar_url, status, xmtp_inbox_id } = body;

    if (!wallet) {
      return NextResponse.json({ error: "wallet required" }, { status: 400 });
    }

    const profile = await upsertProfile(wallet, {
      display_name,
      avatar_url,
      status,
      xmtp_inbox_id,
    });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[BIM API] Failed to update profile:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
