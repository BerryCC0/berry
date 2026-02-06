/**
 * Persona KYC Webhook API
 * Receives webhook events from Persona and updates KYC verification status
 * 
 * Webhook signature format (Persona-Signature header):
 * t=<timestamp>,v1=<signature>
 * 
 * Signature is HMAC-SHA256 of "<timestamp>.<raw_body>" using webhook secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const sql = process.env.DATABASE_URL 
  ? neon(process.env.DATABASE_URL) 
  : null;

const WEBHOOK_SECRET = process.env.PERSONA_WEBHOOK_SECRET || '';

// Parse the Persona-Signature header
// Format: t=<timestamp>,v1=<signature> (may have multiple v1 for secret rotation)
function parseSignatureHeader(header: string): { timestamp: string; signatures: string[] } {
  const parts = header.split(',');
  let timestamp = '';
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key === 't') {
      timestamp = value;
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

// Verify the webhook signature
function verifySignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  if (!secret) {
    console.warn('PERSONA_WEBHOOK_SECRET not configured, skipping signature verification');
    return true; // Allow in development without secret
  }

  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    console.error('Invalid signature header format');
    return false;
  }

  // Compute expected signature: HMAC-SHA256 of "<timestamp>.<body>"
  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Check if any provided signature matches (handles secret rotation)
  return signatures.some(sig => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(sig, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      return false;
    }
  });
}

// Extract wallet address from reference ID or fields
function extractWalletAddress(inquiry: PersonaInquiry): string | null {
  // Try to extract from reference ID (format: <title>-<wallet>-berry-os)
  if (inquiry.attributes?.['reference-id']) {
    const refId = inquiry.attributes['reference-id'];
    const parts = refId.split('-');
    // Look for something that looks like an Ethereum address
    for (const part of parts) {
      if (part.startsWith('0x') && part.length === 42) {
        return part.toLowerCase();
      }
    }
  }

  // Try to extract from fields
  const fields = inquiry.attributes?.fields || {};
  if (fields.crypto_wallet_address) {
    const addr = typeof fields.crypto_wallet_address === 'object' 
      ? (fields.crypto_wallet_address as { value?: string })?.value 
      : fields.crypto_wallet_address;
    if (typeof addr === 'string' && addr.startsWith('0x')) {
      return addr.toLowerCase();
    }
  }

  return null;
}

// Persona webhook payload types
interface PersonaInquiry {
  type: string;
  id: string;
  attributes?: {
    status?: string;
    'reference-id'?: string;
    'completed-at'?: string;
    'created-at'?: string;
    fields?: Record<string, unknown>;
  };
}

interface PersonaWebhookPayload {
  data: {
    type: string;
    id: string;
    attributes: {
      name: string;
      'created-at': string;
      payload: {
        data: PersonaInquiry;
      };
    };
  };
}

// POST - Handle Persona webhook
export async function POST(request: NextRequest) {
  if (!sql) {
    console.error('Database not configured');
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // Verify signature
    const signatureHeader = request.headers.get('Persona-Signature') || '';
    if (!verifySignature(rawBody, signatureHeader, WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the webhook payload
    const payload: PersonaWebhookPayload = JSON.parse(rawBody);
    
    const eventName = payload.data?.attributes?.name;
    const inquiry = payload.data?.attributes?.payload?.data;

    if (!inquiry) {
      console.error('Invalid webhook payload: missing inquiry data');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const inquiryId = inquiry.id;
    const status = inquiry.attributes?.status || 'unknown';
    const referenceId = inquiry.attributes?.['reference-id'] || null;
    const walletAddress = extractWalletAddress(inquiry);
    const verifiedAt = inquiry.attributes?.['completed-at'] || null;

    console.log(`KYC Webhook received: ${eventName} for inquiry ${inquiryId}, status: ${status}`);

    // Only process relevant events
    const relevantEvents = [
      'inquiry.completed',
      'inquiry.approved',
      'inquiry.declined',
      'inquiry.expired',
      'inquiry.failed',
      'inquiry.marked-for-review',
    ];

    if (!relevantEvents.includes(eventName)) {
      // Acknowledge but don't process
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    // Upsert the KYC verification record
    await sql`
      INSERT INTO kyc_verifications (
        inquiry_id,
        reference_id,
        wallet_address,
        status,
        verified_at,
        updated_at
      ) VALUES (
        ${inquiryId},
        ${referenceId},
        ${walletAddress},
        ${status},
        ${verifiedAt ? new Date(verifiedAt).toISOString() : null},
        NOW()
      )
      ON CONFLICT (inquiry_id)
      DO UPDATE SET
        status = ${status},
        verified_at = COALESCE(kyc_verifications.verified_at, ${verifiedAt ? new Date(verifiedAt).toISOString() : null}),
        updated_at = NOW()
    `;

    console.log(`KYC verification upserted: ${inquiryId} -> ${status} for wallet ${walletAddress}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Health check (for Persona webhook configuration testing)
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    endpoint: 'Persona KYC Webhook',
    configured: !!WEBHOOK_SECRET 
  });
}
