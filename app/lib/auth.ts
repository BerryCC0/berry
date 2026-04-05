import { verifyMessage } from 'viem';

const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

interface AuthResult {
  authenticated: boolean;
  address: string | null;
  error?: string;
}

/**
 * Verify wallet ownership from request headers.
 * Expects headers:
 *   x-wallet-address: The claimed wallet address
 *   x-wallet-signature: The signature of the session message
 *   x-wallet-timestamp: The unix timestamp when the message was signed
 *
 * The signed message format is: "Berry OS Session\nAddress: {address}\nTimestamp: {timestamp}"
 */
export async function verifyWalletAuth(request: Request): Promise<AuthResult> {
  const address = request.headers.get('x-wallet-address')?.toLowerCase();
  const signature = request.headers.get('x-wallet-signature');
  const timestamp = request.headers.get('x-wallet-timestamp');

  if (!address || !signature || !timestamp) {
    return { authenticated: false, address: null, error: 'Missing auth headers' };
  }

  // Check timestamp freshness
  const signedAt = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(signedAt) || now - signedAt > SESSION_MAX_AGE) {
    return { authenticated: false, address: null, error: 'Session expired' };
  }

  // Reconstruct the message that was signed
  const message = `Berry OS Session\nAddress: ${address}\nTimestamp: ${timestamp}`;

  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      return { authenticated: false, address: null, error: 'Invalid signature' };
    }

    return { authenticated: true, address };
  } catch {
    return { authenticated: false, address: null, error: 'Signature verification failed' };
  }
}

/**
 * Helper to require wallet auth and return 401 if not authenticated.
 * Returns the verified address or null (with response already sent).
 */
export async function requireWalletAuth(request: Request): Promise<{ address: string } | Response> {
  const result = await verifyWalletAuth(request);
  if (!result.authenticated || !result.address) {
    return new Response(
      JSON.stringify({ error: result.error || 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return { address: result.address };
}
