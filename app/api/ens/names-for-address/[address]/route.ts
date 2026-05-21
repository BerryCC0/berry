/**
 * GET /api/ens/names-for-address/[address]
 *
 * Returns every ENS name the address owns at the Registry, Registrar, or
 * NameWrapper layer. Sources from our Ponder-indexed ens_domains table
 * (no third-party subgraph dep).
 *
 * Match logic:
 *   registrant = address       → .eth 2LD held as ERC-721 (unwrapped)
 *   wrapped_owner = address    → wrapped name held as ERC-1155
 *   owner = address            → Registry-level ownership (DNS imports, subnames)
 *
 * A name may match on multiple fields (e.g. unwrapped .eth: both registrant
 * and owner = user). We return one row per name and let the client read
 * whichever fields matter for its use case.
 */

import { NextRequest, NextResponse } from "next/server";
import { ponderSql } from "@/app/lib/ponder-db";

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

  try {
    const sql = ponderSql();

    const rows = await sql`
      SELECT
        node,
        name,
        label,
        parent,
        owner,
        registrant,
        wrapped_owner AS "wrappedOwner",
        resolver,
        expiry,
        is_wrapped AS "isWrapped",
        fuses
      FROM ponder_live.ens_domains
      WHERE registrant = ${address}
         OR wrapped_owner = ${address}
         OR owner = ${address}
      ORDER BY expiry DESC NULLS LAST, name ASC NULLS LAST
      LIMIT 200
    `;

    const names: NameRecord[] = rows.map((row) => ({
      node: row.node as string,
      name: (row.name as string | null) ?? null,
      label: (row.label as string | null) ?? null,
      parent: (row.parent as string | null) ?? null,
      owner: (row.owner as string | null) ?? null,
      registrant: (row.registrant as string | null) ?? null,
      wrappedOwner: (row.wrappedOwner as string | null) ?? null,
      resolver: (row.resolver as string | null) ?? null,
      expiry: row.expiry !== null && row.expiry !== undefined ? String(row.expiry) : null,
      isWrapped: Boolean(row.isWrapped),
      fuses: row.fuses !== null && row.fuses !== undefined ? Number(row.fuses) : null,
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
