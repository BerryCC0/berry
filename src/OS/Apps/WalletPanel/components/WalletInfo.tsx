"use client";

/**
 * WalletInfo Component
 * Displays wallet address, ENS name, and connection status
 */

import { useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import styles from "./WalletInfo.module.css";

interface WalletInfoProps {
  address: string;
  ensName?: string;
  ensAvatar?: string;
  chainName: string;
}

export function WalletInfo({ address, ensName, ensAvatar, chainName }: WalletInfoProps) {
  const [copied, setCopied] = useState(false);
  const { open } = useAppKit();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleManageWallets = () => {
    open({ view: "Account" });
  };

  return (
    <div className={styles.walletInfo}>
      <div className={styles.header}>
        {/* Avatar */}
        <div className={styles.avatar}>
          {ensAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ensAvatar} alt="" className={styles.avatarImage} />
          ) : (
            <span className={styles.avatarFallback}>
              {address.slice(2, 4).toUpperCase()}
            </span>
          )}
        </div>

        {/* Identity */}
        <div className={styles.identity}>
          {ensName ? (
            <>
              <div className={styles.ensName}>{ensName}</div>
              <div className={styles.address}>{formatAddress(address)}</div>
            </>
          ) : (
            <div className={styles.addressOnly}>{formatAddress(address)}</div>
          )}
        </div>

        {/* Copy button */}
        <button
          className={styles.copyButton}
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy address"}
        >
          {copied ? "✓" : "⎘"}
        </button>
      </div>

      {/* Network indicator */}
      <div className={styles.network}>
        <span className={styles.networkDot}>●</span>
        <span className={styles.networkText}>Connected to {chainName}</span>
      </div>

      {/* Manage Wallets Button */}
      <button className={styles.manageButton} onClick={handleManageWallets}>
        Manage Wallets
      </button>
    </div>
  );
}

