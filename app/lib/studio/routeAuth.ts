/**
 * Berry Studio — shared route-level wallet auth helper.
 *
 * Mirrors the soft-launch pattern used in
 * `app/api/proposals/drafts/route.ts`: if wallet auth headers are
 * present they must verify and match the wallet param; if they are
 * absent we let the request through (soft launch).
 *
 * Returns `{ ok: true, wallet }` on success, or `{ ok: false, response }`
 * with a fully-formed NextResponse ready to return from the route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWalletAuth } from '@/app/lib/auth';

export type StudioAuthResult =
  | { ok: true; wallet: string }
  | { ok: false; response: NextResponse };

export async function authorizeWallet(
  request: NextRequest,
  walletFromRequest: string | null
): Promise<StudioAuthResult> {
  if (!walletFromRequest) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      ),
    };
  }

  const hasAuthHeaders =
    request.headers.has('x-wallet-address') ||
    request.headers.has('x-wallet-signature') ||
    request.headers.has('x-wallet-timestamp');

  if (!hasAuthHeaders) {
    // Soft launch: allow unauthenticated requests through.
    return { ok: true, wallet: walletFromRequest.toLowerCase() };
  }

  const result = await verifyWalletAuth(request);
  if (result.error) {
    return {
      ok: false,
      response: NextResponse.json({ error: result.error }, { status: 401 }),
    };
  }
  if (
    !result.authenticated ||
    !result.address ||
    result.address.toLowerCase() !== walletFromRequest.toLowerCase()
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Wallet mismatch' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, wallet: result.address.toLowerCase() };
}

/**
 * Pull the wallet from a query param, falling back to the
 * `x-wallet-address` header. Most routes pass `?wallet=0x…` in the URL,
 * but POST/PATCH bodies can also include `wallet` (callers pass it via
 * the body — see `walletFromBody` below).
 */
export function walletFromRequest(request: NextRequest): string | null {
  const url = new URL(request.url);
  return (
    url.searchParams.get('wallet') ||
    request.headers.get('x-wallet-address') ||
    null
  );
}

export function walletFromBody(
  body: unknown,
  fallback: string | null
): string | null {
  if (
    body &&
    typeof body === 'object' &&
    'wallet' in body &&
    typeof (body as { wallet: unknown }).wallet === 'string'
  ) {
    return (body as { wallet: string }).wallet;
  }
  return fallback;
}
