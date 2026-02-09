/**
 * useXmtpClient — Initialize XMTP from wagmi wallet
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWalletClient } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import type { Client } from "@xmtp/browser-sdk";
import { createXmtpSigner, createXmtpClient } from "../lib/xmtp";
import { useBimStore } from "../store/bimStore";

// Store XMTP client outside of React state (not serializable)
let xmtpClient: Client | null = null;

export function getXmtpClient(): Client | null {
  return xmtpClient;
}

export function useXmtpClient() {
  const { data: walletClient } = useWalletClient();
  const { isConnected, address } = useAppKitAccount();
  const {
    isXmtpReady,
    isXmtpConnecting,
    xmtpError,
    setXmtpReady,
    setXmtpConnecting,
    setXmtpError,
    setInboxId,
    reset: resetStore,
  } = useBimStore();

  const initRef = useRef(false);
  const addressRef = useRef<string | undefined>(undefined);

  // Initialize XMTP client when wallet connects
  useEffect(() => {
    if (!isConnected || !walletClient || !address) {
      // Wallet disconnected — clean up
      if (xmtpClient) {
        xmtpClient.close();
        xmtpClient = null;
        resetStore();
      }
      initRef.current = false;
      addressRef.current = undefined;
      return;
    }

    // Already initialized for this address
    if (initRef.current && addressRef.current === address) return;

    // Prevent concurrent initialization
    if (isXmtpConnecting) return;

    const init = async () => {
      try {
        initRef.current = true;
        addressRef.current = address;
        setXmtpConnecting(true);
        setXmtpError(null);

        const signer = createXmtpSigner(walletClient);
        const client = await createXmtpClient(signer);

        xmtpClient = client;
        setInboxId(client.inboxId ?? null);
        setXmtpReady(true);
        setXmtpConnecting(false);

        if (process.env.NODE_ENV === "development") {
          console.log("[BIM] XMTP client initialized, inbox:", client.inboxId);
        }
      } catch (err) {
        console.error("[BIM] Failed to initialize XMTP:", err);
        setXmtpError(err instanceof Error ? err.message : "Failed to connect to XMTP");
        setXmtpConnecting(false);
        initRef.current = false;
      }
    };

    init();
  }, [isConnected, walletClient, address, isXmtpConnecting, setXmtpReady, setXmtpConnecting, setXmtpError, setInboxId, resetStore]);

  const disconnect = useCallback(() => {
    if (xmtpClient) {
      xmtpClient.close();
    }
    xmtpClient = null;
    resetStore();
    initRef.current = false;
    addressRef.current = undefined;
  }, [resetStore]);

  return {
    client: xmtpClient,
    isReady: isXmtpReady,
    isConnecting: isXmtpConnecting,
    error: xmtpError,
    disconnect,
  };
}
