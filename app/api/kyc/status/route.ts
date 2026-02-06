/**
 * KYC Status Check API
 * Returns server-verified KYC status for a wallet address
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = process.env.DATABASE_URL 
  ? neon(process.env.DATABASE_URL) 
  : null;

// Valid verification statuses that indicate completed KYC
const VERIFIED_STATUSES = ['completed', 'approved'];

export async function GET(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ 
      success: false, 
      error: 'Database not configured' 
    }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ 
      success: false, 
      error: 'Wallet address required' 
    }, { status: 400 });
  }

  // Validate wallet address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid wallet address format' 
    }, { status: 400 });
  }

  try {
    // Get the most recent KYC verification for this wallet
    const results = await sql`
      SELECT 
        inquiry_id,
        reference_id,
        status,
        verified_at,
        created_at,
        updated_at
      FROM kyc_verifications
      WHERE LOWER(wallet_address) = ${wallet.toLowerCase()}
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        verified: false,
        status: null,
        message: 'No KYC verification found for this wallet'
      });
    }

    const verification = results[0];
    const isVerified = VERIFIED_STATUSES.includes(verification.status);

    return NextResponse.json({
      success: true,
      verified: isVerified,
      status: verification.status,
      inquiryId: verification.inquiry_id,
      verifiedAt: verification.verified_at,
      updatedAt: verification.updated_at
    });
  } catch (error) {
    console.error('Error checking KYC status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check KYC status' 
    }, { status: 500 });
  }
}
