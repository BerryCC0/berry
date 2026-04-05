'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

interface WalletSession {
  address: string;
  signature: string;
  timestamp: string;
}

// Module-level session cache (persists across renders, cleared on page reload)
let currentSession: WalletSession | null = null;

/**
 * Hook that manages wallet authentication sessions.
 * Signs a session message when the wallet connects and provides
 * auth headers for protected API calls.
 */
export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const signingRef = useRef(false);

  // Clear session when wallet disconnects or changes
  useEffect(() => {
    if (!isConnected || !address) {
      currentSession = null;
      return;
    }
    if (currentSession && currentSession.address.toLowerCase() !== address.toLowerCase()) {
      currentSession = null;
    }
  }, [address, isConnected]);

  const ensureSession = useCallback(async (): Promise<WalletSession | null> => {
    if (!address || !isConnected) return null;

    // Check if existing session is still valid (same address, not expired)
    if (currentSession) {
      const signedAt = parseInt(currentSession.timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      const SESSION_MAX_AGE = 24 * 60 * 60;
      if (
        currentSession.address.toLowerCase() === address.toLowerCase() &&
        now - signedAt < SESSION_MAX_AGE
      ) {
        return currentSession;
      }
      currentSession = null;
    }

    // Prevent concurrent signing requests
    if (signingRef.current) return null;
    signingRef.current = true;

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const lowerAddress = address.toLowerCase();
      const message = `Berry OS Session\nAddress: ${lowerAddress}\nTimestamp: ${timestamp}`;

      const signature = await signMessageAsync({ message });

      currentSession = {
        address: lowerAddress,
        signature,
        timestamp,
      };
      return currentSession;
    } catch {
      // User rejected signing or error occurred
      return null;
    } finally {
      signingRef.current = false;
    }
  }, [address, isConnected, signMessageAsync]);

  /**
   * Get auth headers for protected API calls.
   * Returns empty object if no session (API call will proceed without auth).
   */
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!currentSession) return {};
    return {
      'x-wallet-address': currentSession.address,
      'x-wallet-signature': currentSession.signature,
      'x-wallet-timestamp': currentSession.timestamp,
    };
  }, []);

  /**
   * Make an authenticated fetch call.
   * Ensures session exists (may prompt for signature), then adds auth headers.
   * Falls back to unauthenticated call if signing is rejected.
   */
  const authFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      const session = await ensureSession();
      const headers = new Headers(init?.headers);

      if (session) {
        headers.set('x-wallet-address', session.address);
        headers.set('x-wallet-signature', session.signature);
        headers.set('x-wallet-timestamp', session.timestamp);
      }

      return fetch(url, { ...init, headers });
    },
    [ensureSession],
  );

  return {
    /** Whether we have a valid session */
    hasSession: !!currentSession && currentSession.address.toLowerCase() === address?.toLowerCase(),
    /** Ensure a session exists (may prompt wallet signature) */
    ensureSession,
    /** Get auth headers to add to fetch calls */
    getAuthHeaders,
    /** Authenticated fetch wrapper */
    authFetch,
  };
}
