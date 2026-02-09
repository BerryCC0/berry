/**
 * BIM Invite API
 * GET  /api/bim/servers/:id/invite          → Get invite code
 * POST /api/bim/servers/:id/invite          → Regenerate invite code
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getServerById,
  regenerateInviteCode,
  getMemberRole,
} from "@/app/lib/bim/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  try {
    const server = await getServerById(serverId);
    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }
    return NextResponse.json({ invite_code: server.invite_code });
  } catch (err) {
    console.error("[BIM API] Failed to get invite:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  try {
    const body = await request.json();
    const { wallet } = body;

    // Verify admin permission
    if (wallet) {
      const role = await getMemberRole(serverId, wallet);
      if (!role || (role !== "owner" && role !== "admin")) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const newCode = await regenerateInviteCode(serverId);
    return NextResponse.json({ invite_code: newCode });
  } catch (err) {
    console.error("[BIM API] Failed to regenerate invite:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
