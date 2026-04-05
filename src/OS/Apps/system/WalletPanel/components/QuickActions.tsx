"use client";

/**
 * QuickActions Component
 * Quick action buttons for wallet operations
 */

import { useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import styles from "./QuickActions.module.css";

interface QuickActionsProps {
  address?: string;
}

export function QuickActions({ address }: QuickActionsProps) {
  const { open } = useAppKit();
  const [showReceive, setShowReceive] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSend = () => {
    // Opens AppKit's built-in send interface
    open({ view: "WalletSend" });
  };

  const handleReceive = () => {
    setShowReceive(!showReceive);
  };

  const handleBuy = () => {
    // Opens AppKit's onramp providers (Coinbase, etc.)
    open({ view: "OnRampProviders" });
  };

  const handleSwap = () => {
    // Opens AppKit's built-in swap interface (powered by 1inch)
    open({ view: "Swap" });
  };

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={styles.quickActions}>
      <div className={styles.label}>Quick Actions</div>
      
      <div className={styles.actions}>
        <button className={styles.actionButton} onClick={handleSend}>
          <span className={styles.actionIcon}>↗</span>
          <span className={styles.actionLabel}>Send</span>
        </button>

        <button className={styles.actionButton} onClick={handleReceive}>
          <span className={styles.actionIcon}>↙</span>
          <span className={styles.actionLabel}>Receive</span>
        </button>

        <button className={styles.actionButton} onClick={handleBuy}>
          <span className={styles.actionIcon}>+</span>
          <span className={styles.actionLabel}>Buy</span>
        </button>

        <button className={styles.actionButton} onClick={handleSwap}>
          <span className={styles.actionIcon}>⇄</span>
          <span className={styles.actionLabel}>Swap</span>
        </button>
      </div>

      {/* Receive panel */}
      {showReceive && address && (
        <div className={styles.receivePanel}>
          <div className={styles.receiveTitle}>Your Wallet Address</div>
          <div className={styles.addressBox}>
            <code className={styles.addressCode}>{address}</code>
          </div>
          <button className={styles.copyButton} onClick={handleCopy}>
            {copied ? "✓ Copied!" : "Copy Address"}
          </button>
        </div>
      )}
    </div>
  );
}

