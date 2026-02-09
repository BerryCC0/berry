/**
 * BIM Channels API
 * GET  /api/bim/servers/:id/channels        → List channels for server
 * POST /api/bim/servers/:id/channels        → Create a channel
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getChannelsForServer,
  createChannel,
  getMemberRole,
} from "@/app/lib/bim/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  try {
    const channels = await getChannelsForServer(serverId);
    return NextResponse.json({ channels });
  } catch (err) {
    console.error("[BIM API] Failed to fetch channels:", err);
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
    const { wallet, name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    // Verify admin permission
    if (wallet) {
      const role = await getMemberRole(serverId, wallet);
      if (!role || (role !== "owner" && role !== "admin")) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const channel = await createChannel(serverId, { name, description });
    return NextResponse.json({ channel });
  } catch (err) {
    console.error("[BIM API] Failed to create channel:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
