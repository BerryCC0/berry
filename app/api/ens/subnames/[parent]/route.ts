/**
 * GET /api/ens/subnames/[parent]
 *
 * Lists indexed subnames whose parent is the given name. Powers the
 * Subnames section in NameDetail. Returns up to 100 rows sorted by name.
 */

import { NextRequest, NextResponse } from "next/server";
import { namehash, normalize } from "viem/ens";
import { ponderSql } from "@/app/lib/ponder-db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ parent: string }> },
) {
  const { parent: rawParent } = await params;
  let parentName: string;
  try {
    parentName = normalize(decodeURIComponent(rawParent));
  } catch {
    return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
  }
  if (!parentName.includes(".") && parentName !== "eth") {
    return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
  }

  const parentNode = namehash(parentName);

  try {
    const sql = ponderSql();
    const rows = await sql`
      SELECT
        node,
        name,
        label,
        owner,
        registrant,
        wrapped_owner AS "wrappedOwner",
        resolver,
        expiry,
        is_wrapped AS "isWrapped",
        fuses
      FROM ponder_live.ens_domains
      WHERE parent = ${parentNode}
      ORDER BY name ASC NULLS LAST
      LIMIT 100
    `;

    return NextResponse.json({
      parent: parentName,
      parentNode,
      subnames: rows.map((row) => ({
        node: row.node as string,
        name: (row.name as string | null) ?? null,
        label: (row.label as string | null) ?? null,
        owner: (row.owner as string | null) ?? null,
        registrant: (row.registrant as string | null) ?? null,
        wrappedOwner: (row.wrappedOwner as string | null) ?? null,
        resolver: (row.resolver as string | null) ?? null,
        expiry: row.expiry !== null && row.expiry !== undefined ? String(row.expiry) : null,
        isWrapped: Boolean(row.isWrapped),
        fuses: row.fuses !== null && row.fuses !== undefined ? Number(row.fuses) : null,
      })),
    });
  } catch (error) {
    console.error("[API] /api/ens/subnames failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch subnames" },
      { status: 500 },
    );
  }
}
