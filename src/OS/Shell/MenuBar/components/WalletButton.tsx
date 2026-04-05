"use client";

/**
 * WalletButton Component
 * Shows wallet connection status in the menu bar.
 * Click to open the Wallet Panel app.
 * Uses ENS resolution to display names when available.
 */

import { useWallet } from "@/OS/hooks/useWallet";
import { useENS } from "@/OS/hooks/useENS";
import { appLauncher, getAppConfig } from "@/OS/lib/AppLauncher";
import { detectPlatform } from "@/OS/lib/PlatformDetection";

/** Menu bar height constant */
const MENU_BAR_HEIGHT = 24;

interface WalletButtonProps {
  styles: Record<string, string>;
}

export function WalletButton({ styles }: WalletButtonProps) {
  const { isConnected, address } = useWallet();
  const { displayName, avatar, isLoading } = useENS(address);

  const handleClick = () => {
    const platform = detectPlatform();
    
    // On desktop, position in top-right corner
    if (platform.type === "desktop") {
      const config = getAppConfig("wallet-panel");
      const windowWidth = config?.window.width ?? 360;
      
      const x = platform.screenWidth - windowWidth;
      const y = MENU_BAR_HEIGHT;
      
      appLauncher.launch("wallet-panel", { x, y });
    } else {
      // On mobile/tablet, use default positioning
      appLauncher.launch("wallet-panel");
    }
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

