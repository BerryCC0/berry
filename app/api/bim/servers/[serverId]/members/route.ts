/**
 * BIM Members API
 * GET    /api/bim/servers/:id/members         → List members
 * POST   /api/bim/servers/:id/members         → Add a member
 * DELETE /api/bim/servers/:id/members?wallet=  → Remove a member
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getMembersForServer,
  addMember,
  removeMember,
  updateMemberRole,
  getMemberRole,
  getProfiles,
} from "@/app/lib/bim/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  try {
    const members = await getMembersForServer(serverId);

    // Enrich with profile data
    const addresses = members.map((m) => m.wallet_address);
    const profiles = await getProfiles(addresses);
    const profileMap = new Map(profiles.map((p) => [p.wallet_address.toLowerCase(), p]));

    const enriched = members.map((m) => {
      const profile = profileMap.get(m.wallet_address.toLowerCase());
      return {
        ...m,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      };
    });

    return NextResponse.json({ members: enriched });
  } catch (err) {
    console.error("[BIM API] Failed to fetch members:", err);
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
    const { wallet, targetWallet, role } = body;

    const targetAddress = targetWallet || wallet;
    if (!targetAddress) {
      return NextResponse.json({ error: "wallet required" }, { status: 400 });
    }

    // If adding someone else, verify admin permission
    if (targetWallet && wallet && targetWallet !== wallet) {
      const callerRole = await getMemberRole(serverId, wallet);
      if (!callerRole || (callerRole !== "owner" && callerRole !== "admin")) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const member = await addMember(serverId, targetAddress, role || "member");
    return NextResponse.json({ member });
  } catch (err) {
    console.error("[BIM API] Failed to add member:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  const wallet = request.nextUrl.searchParams.get("wallet");
  const target = request.nextUrl.searchParams.get("target");

  try {
    const removeTarget = target || wallet;
    if (!removeTarget) {
      return NextResponse.json({ error: "wallet required" }, { status: 400 });
    }

    // If removing someone else, verify admin permission
    if (target && wallet && target.toLowerCase() !== wallet.toLowerCase()) {
      const callerRole = await getMemberRole(serverId, wallet);
      if (!callerRole || (callerRole !== "owner" && callerRole !== "admin")) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const removed = await removeMember(serverId, removeTarget);
    if (!removed) {
      return NextResponse.json({ error: "Cannot remove member (owner or not found)" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[BIM API] Failed to remove member:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
