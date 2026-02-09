/**
 * BIM Server Detail API
 * GET    /api/bim/servers/:id          → Get server details
 * PUT    /api/bim/servers/:id          → Update server
 * DELETE /api/bim/servers/:id?wallet=  → Delete server (owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getServerById,
  updateServer,
  deleteServer,
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
    return NextResponse.json({ server });
  } catch (err) {
    console.error("[BIM API] Failed to get server:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  try {
    const body = await request.json();
    const { wallet, name, description, icon_url } = body;

    // Verify admin permission
    if (wallet) {
      const role = await getMemberRole(serverId, wallet);
      if (!role || (role !== "owner" && role !== "admin")) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const updated = await updateServer(serverId, { name, description, icon_url });
    return NextResponse.json({ server: updated });
  } catch (err) {
    console.error("[BIM API] Failed to update server:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  const wallet = request.nextUrl.searchParams.get("wallet");

  try {
    // Verify owner permission
    if (wallet) {
      const role = await getMemberRole(serverId, wallet);
      if (role !== "owner") {
        return NextResponse.json({ error: "Only the owner can delete a server" }, { status: 403 });
      }
    }

    const deleted = await deleteServer(serverId);
    if (!deleted) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[BIM API] Failed to delete server:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
