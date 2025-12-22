"use client";

/**
 * WalletButton Component
 * Shows wallet connection status in the menu bar.
 * Click to open the Wallet Panel app.
 * Uses ENS resolution to display names when available.
 */

import { useWallet } from "@/OS/hooks/useWallet";
import { useENS } from "@/OS/hooks/useENS";
import { appLauncher } from "@/OS/lib/AppLauncher";

interface WalletButtonProps {
  styles: Record<string, string>;
}

export function WalletButton({ styles }: WalletButtonProps) {
  const { isConnected, address } = useWallet();
  const { displayName, avatar, isLoading } = useENS(address);

  const handleClick = () => {
    // Open the Wallet Panel app
    appLauncher.launch("wallet-panel");
  };

  return (
    <button onClick={handleClick} className={styles.walletButton}>
      {isConnected ? (
        <>
          {avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className={styles.walletAvatar}
            />
          )}
          {!avatar && <span className={styles.walletIndicator}>●</span>}
          <span className={styles.walletAddress}>
            {isLoading ? "..." : displayName}
          </span>
        </>
      ) : (
        <span>Connect</span>
      )}
    </button>
  );
}

