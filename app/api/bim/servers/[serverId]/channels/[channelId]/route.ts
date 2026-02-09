/**
 * BIM Channel API
 * PATCH /api/bim/servers/:serverId/channels/:channelId → Update channel (e.g., set xmtp_group_id)
 */

import { NextRequest, NextResponse } from "next/server";
import { updateChannelXmtpGroupId, getMemberRole } from "@/app/lib/bim/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string; channelId: string }> }
) {
  const { serverId, channelId } = await params;
  try {
    const body = await request.json();
    const { wallet, xmtp_group_id } = body;

    if (!xmtp_group_id) {
      return NextResponse.json({ error: "xmtp_group_id required" }, { status: 400 });
    }

    // Verify the caller is a member of this server
    if (wallet) {
      const role = await getMemberRole(serverId, wallet);
      if (!role) {
        return NextResponse.json({ error: "Not a member of this server" }, { status: 403 });
      }
    }

    await updateChannelXmtpGroupId(channelId, xmtp_group_id);
    return NextResponse.json({ ok: true, channelId, xmtp_group_id });
  } catch (err) {
    console.error("[BIM API] Failed to update channel:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
