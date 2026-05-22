/**
 * GET /api/ens/subnames/[parent]
 *
 * Server-side proxy to ensjs.getSubnames (ENS subgraph). Keeps the
 * subgraph API key (ENS_SUBGRAPH_API_KEY) off the client.
 *
 * The frontend hits this route via useEnsSubnames.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSubnames } from "@ensdomains/ensjs/subgraph";
import { normalize } from "viem/ens";
import { ensPublicClient } from "@/app/lib/ens/client";

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

  if (!process.env.ENS_SUBGRAPH_API_KEY) {
    return NextResponse.json(
      { error: "ENS_SUBGRAPH_API_KEY not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await getSubnames(ensPublicClient(), {
      name: parentName,
      pageSize: 100,
    });

    const subnames = result.map((s) => ({
      node: s.id,
      name: s.name ?? null,
      label: s.labelName ?? null,
      parent: parentName,
      owner: (s.owner as string | null) ?? null,
      registrant: null,
      wrappedOwner: (s.wrappedOwner as string | null) ?? null,
      resolver: null,
      expiry: s.expiryDate?.value ? String(s.expiryDate.value) : null,
      isWrapped: Boolean(s.wrappedOwner),
      fuses: typeof s.fuses === "number" ? s.fuses : null,
    }));

    return NextResponse.json({ parent: parentName, subnames });
  } catch (error) {
    console.error("[API] subnames failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch subnames" },
      { status: 500 },
    );
  }
}
