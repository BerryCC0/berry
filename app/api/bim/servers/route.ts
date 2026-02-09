/**
 * BIM Servers API
 * GET  /api/bim/servers?wallet=0x...  → List user's servers
 * POST /api/bim/servers               → Create a new server
 * POST /api/bim/servers (join)        → Join via invite code (body: { inviteCode })
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getServersForUser,
  createServer,
  createChannel,
  getServerByInviteCode,
  addMember,
  getChannelsForServer,
} from "@/app/lib/bim/db";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet parameter required" }, { status: 400 });
  }

  try {
    const servers = await getServersForUser(wallet);
    return NextResponse.json({ servers });
  } catch (err) {
    console.error("[BIM API] Failed to fetch servers:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, name, description, inviteCode } = body;

    if (!wallet) {
      return NextResponse.json({ error: "wallet required" }, { status: 400 });
    }

    // Join by invite code
    if (inviteCode) {
      const server = await getServerByInviteCode(inviteCode);
      if (!server) {
        return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
      }
      await addMember(server.id, wallet, "member");
      return NextResponse.json({ server });
    }

    // Create new server
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const server = await createServer(wallet, { name, description });

    // Create default #general channel
    const generalChannel = await createChannel(server.id, {
      name: "general",
      description: "General discussion",
      is_default: true,
    });

    return NextResponse.json({
      server,
      channels: [generalChannel],
    });
  } catch (err) {
    console.error("[BIM API] Failed to create/join server:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
