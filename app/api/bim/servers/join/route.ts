/**
 * BIM Join Server API
 * POST /api/bim/servers/join  → Join a server by invite code
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getServerByInviteCode,
  addMember,
  isMember,
} from "@/app/lib/bim/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, inviteCode } = body;

    if (!wallet || !inviteCode) {
      return NextResponse.json({ error: "wallet and inviteCode required" }, { status: 400 });
    }

    const server = await getServerByInviteCode(inviteCode);
    if (!server) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Check if already a member
    const alreadyMember = await isMember(server.id, wallet);
    if (alreadyMember) {
      return NextResponse.json({ server, alreadyMember: true });
    }

    await addMember(server.id, wallet, "member");
    return NextResponse.json({ server });
  } catch (err) {
    console.error("[BIM API] Failed to join server:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
