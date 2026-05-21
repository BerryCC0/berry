/**
 * GET /api/ens/domain/[name]
 *
 * Returns the full ens_domains row for a given name. The name is
 * namehashed server-side so callers don't have to. Used by NameDetail
 * to read everything we know about a name in one round-trip:
 *
 *   - ownership at all three layers (registry / registrar / wrapper)
 *   - resolver pointer
 *   - expiry
 *   - wrap state + burned fuses
 *   - parent
 *
 * For record data (text, addr, content hash) callers still use the
 * Universal Resolver hooks — those aren't indexed, only on-chain reads.
 */

import { NextRequest, NextResponse } from "next/server";
import { namehash, normalize } from "viem/ens";
import { ponderSql } from "@/app/lib/ponder-db";

interface DomainRow {
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
  { params }: { params: Promise<{ name: string }> },
) {
  const { name: rawName } = await params;
  let name: string;
  try {
    name = normalize(decodeURIComponent(rawName));
  } catch {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  if (!name.includes(".")) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const node = namehash(name);

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
      WHERE node = ${node}
      LIMIT 1
    `;

    if (rows.length === 0) {
      // Not yet indexed (or never existed). Return a stub so callers
      // can still render — they'll fall back to on-chain reads.
      return NextResponse.json({
        name,
        node,
        domain: null,
      });
    }

    const row = rows[0];
    const domain: DomainRow = {
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
    };

    return NextResponse.json({ name, node, domain });
  } catch (error) {
    console.error("[API] /api/ens/domain failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch domain" },
      { status: 500 },
    );
  }
}
