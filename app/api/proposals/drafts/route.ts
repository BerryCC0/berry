/**
 * Proposal Drafts API
 * GET - Load drafts for a wallet
 * POST - Save a draft
 * DELETE - Delete a draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = process.env.DATABASE_URL 
  ? neon(process.env.DATABASE_URL) 
  : null;

// GET - Load all drafts for a wallet
export async function GET(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ success: false, error: 'Wallet address required' }, { status: 400 });
  }

  try {
    const results = await sql`
      SELECT * FROM proposal_drafts
      WHERE wallet_address = ${wallet.toLowerCase()}
      ORDER BY updated_at DESC
    `;

    const drafts = results.map(row => ({
      id: row.id,
      wallet_address: row.wallet_address,
      draft_slug: row.draft_slug,
      draft_title: row.draft_title,
      title: row.title,
      description: row.description,
      actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions,
      action_templates: typeof row.action_templates === 'string' ? JSON.parse(row.action_templates) : row.action_templates,
      proposal_type: row.proposal_type,
      kyc_verified: row.kyc_verified,
      kyc_inquiry_id: row.kyc_inquiry_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ success: true, drafts });
  } catch (error) {
    console.error('Error loading drafts:', error);
    return NextResponse.json({ success: false, error: 'Failed to load drafts' }, { status: 500 });
  }
}

// POST - Save or update a draft
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const draft = await request.json();

    if (!draft.wallet_address || !draft.draft_slug) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO proposal_drafts (
        wallet_address, draft_slug, draft_title, title, description, 
        actions, action_templates, proposal_type, kyc_verified, kyc_inquiry_id, updated_at
      ) VALUES (
        ${draft.wallet_address.toLowerCase()}, 
        ${draft.draft_slug}, 
        ${draft.draft_title || 'Untitled'},
        ${draft.title || ''}, 
        ${draft.description || ''}, 
        ${JSON.stringify(draft.actions || [])},
        ${JSON.stringify(draft.action_templates || [])},
        ${draft.proposal_type || 'standard'}, 
        ${draft.kyc_verified || false}, 
        ${draft.kyc_inquiry_id || null},
        NOW()
      )
      ON CONFLICT (wallet_address, draft_slug)
      DO UPDATE SET 
        draft_title = ${draft.draft_title || 'Untitled'},
        title = ${draft.title || ''},
        description = ${draft.description || ''},
        actions = ${JSON.stringify(draft.actions || [])},
        action_templates = ${JSON.stringify(draft.action_templates || [])},
        proposal_type = ${draft.proposal_type || 'standard'},
        kyc_verified = ${draft.kyc_verified || false},
        kyc_inquiry_id = ${draft.kyc_inquiry_id || null},
        updated_at = NOW()
      RETURNING id
    `;

    return NextResponse.json({ success: true, id: result[0]?.id });
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json({ success: false, error: 'Failed to save draft' }, { status: 500 });
  }
}

// DELETE - Delete a draft
export async function DELETE(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');
  const slug = searchParams.get('slug');

  if (!wallet || !slug) {
    return NextResponse.json({ success: false, error: 'Wallet and slug required' }, { status: 400 });
  }

  try {
    await sql`
      DELETE FROM proposal_drafts
      WHERE wallet_address = ${wallet.toLowerCase()} AND draft_slug = ${slug}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete draft' }, { status: 500 });
  }
}

// PATCH - Rename a draft
export async function PATCH(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { wallet_address, draft_slug, new_title } = body;

    if (!wallet_address || !draft_slug || !new_title) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await sql`
      UPDATE proposal_drafts
      SET draft_title = ${new_title},
          updated_at = NOW()
      WHERE wallet_address = ${wallet_address.toLowerCase()} AND draft_slug = ${draft_slug}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming draft:', error);
    return NextResponse.json({ success: false, error: 'Failed to rename draft' }, { status: 500 });
  }
}

