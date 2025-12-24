/**
 * Short Links API Route
 * Create, resolve, and manage short links
 * Uses Neon (Postgres) via the existing database connection
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Get database connection
const getDatabaseUrl = () => process.env.DATABASE_URL;

/**
 * GET /api/shortlinks?id=xxx
 * Resolve a short link to its full path
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Short link ID is required" },
      { status: 400 }
    );
  }

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.warn("[ShortLinks API] No database configured");
    return NextResponse.json(
      { error: "Short links not configured" },
      { status: 503 }
    );
  }

  try {
    const sql = neon(databaseUrl);

    // Fetch the short link
    const result = await sql`
      SELECT id, full_path, created_at, expires_at, click_count
      FROM short_links
      WHERE id = ${id}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Short link not found" },
        { status: 404 }
      );
    }

    const data = result[0];

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Short link expired" },
        { status: 410 }
      );
    }

    // Increment click count (fire and forget)
    sql`
      UPDATE short_links 
      SET click_count = click_count + 1 
      WHERE id = ${id}
    `.catch(console.error);

    return NextResponse.json({
      id: data.id,
      fullPath: data.full_path,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error("[ShortLinks API] Error resolving:", error);
    return NextResponse.json(
      { error: "Failed to resolve short link" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shortlinks
 * Create a new short link
 */
export async function POST(request: NextRequest) {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.warn("[ShortLinks API] No database configured");
    return NextResponse.json(
      { error: "Short links not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { id, fullPath, expiresAt, metadata } = body;

    if (!id || !fullPath) {
      return NextResponse.json(
        { error: "ID and fullPath are required" },
        { status: 400 }
      );
    }

    const sql = neon(databaseUrl);

    // Insert the short link
    await sql`
      INSERT INTO short_links (id, full_path, expires_at, metadata, click_count)
      VALUES (
        ${id}, 
        ${fullPath}, 
        ${expiresAt ? new Date(expiresAt).toISOString() : null},
        ${metadata ? JSON.stringify(metadata) : null},
        0
      )
    `;

    return NextResponse.json({ id, success: true });
  } catch (error: unknown) {
    console.error("[ShortLinks API] Error creating:", error);
    
    // Check for duplicate ID (Postgres error code 23505)
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: "Short link ID already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create short link" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shortlinks?id=xxx
 * Delete a short link
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Short link ID is required" },
      { status: 400 }
    );
  }

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return NextResponse.json(
      { error: "Short links not configured" },
      { status: 503 }
    );
  }

  try {
    const sql = neon(databaseUrl);

    await sql`DELETE FROM short_links WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ShortLinks API] Error deleting:", error);
    return NextResponse.json(
      { error: "Failed to delete short link" },
      { status: 500 }
    );
  }
}

