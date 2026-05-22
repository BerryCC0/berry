/**
 * GET /api/ens/names-for-address/[address]
 *
 * Server-side proxy to ensjs.getNamesForAddress (ENS subgraph). The
 * subgraph API key lives in ENS_SUBGRAPH_API_KEY and is never exposed
 * to the browser. Returns up to 100 names sorted by expiry.
 *
 * The frontend hits this route via useMyEnsNames.
 */

import { NextRequest, NextResponse } from "next/server";
import { getNamesForAddress } from "@ensdomains/ensjs/subgraph";
import { ensPublicClient } from "@/app/lib/ens/client";

interface NameRecord {
  node: string;
  name: string | null;
  label: string | null;
  parent: string | null;
  owner: string | null;
  registrant: string | null;
  wrappedOwner: string | null;
  resolver: string | null;
  expiry: string | null;
  isWrapped: boolean;
  fuses: number | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address: rawAddress } = await params;
  const address = rawAddress?.toLowerCase();

  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  if (!process.env.ENS_SUBGRAPH_API_KEY) {
    return NextResponse.json(
      { error: "ENS_SUBGRAPH_API_KEY not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await getNamesForAddress(ensPublicClient(), {
      address: address as `0x${string}`,
      pageSize: 100,
      filter: {
        owner: true,
        registrant: true,
        wrappedOwner: true,
        resolvedAddress: false,
        allowExpired: false,
        allowDeleted: false,
        allowReverseRecord: false,
      },
    });

    const names: NameRecord[] = result.map((n) => ({
      node: n.id,
      name: n.name ?? null,
      label: n.labelName ?? null,
      parent: n.parentName ?? null,
      owner: (n.owner as string | null) ?? null,
      registrant: (n.registrant as string | null) ?? null,
      wrappedOwner: (n.wrappedOwner as string | null) ?? null,
      resolver: null,
      expiry: n.expiryDate?.value ? String(n.expiryDate.value) : null,
      isWrapped: Boolean(n.wrappedOwner),
      fuses: typeof n.fuses === "number" ? n.fuses : null,
    }));

    return NextResponse.json({ address, names });
  } catch (error) {
    console.error("[API] names-for-address failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch names" },
      { status: 500 },
    );
  }
}
