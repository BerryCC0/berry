/**
 * BIM Profile Batch API
 * POST /api/bim/profile/batch  → Fetch multiple profiles at once
 */

import { NextRequest, NextResponse } from "next/server";
import { getProfiles } from "@/app/lib/bim/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallets } = body as { wallets: string[] };

    if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
      return NextResponse.json({ error: "wallets array required" }, { status: 400 });
    }

    // Cap at 100 to prevent abuse
    const capped = wallets.slice(0, 100);
    const profiles = await getProfiles(capped);
    return NextResponse.json({ profiles });
  } catch (err) {
    console.error("[BIM API] Failed to batch fetch profiles:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
