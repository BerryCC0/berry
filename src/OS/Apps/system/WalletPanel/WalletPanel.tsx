"use client";

/**
 * WalletPanel - OS App for Wallet Management
 * 
 * Control Center-style wallet interface with:
 * - Wallet info & ENS display
 * - Token balances (native + ERC-20)
 * - Quick actions (Send, Receive, Buy, Swap)
 * - Disconnect option
 */

import { useWallet } from "@/OS/hooks/useWallet";
import { useENS } from "@/OS/hooks/useENS";
import { useTokenBalances } from "@/OS/hooks/useTokenBalances";
import { useTranslation } from "@/OS/lib/i18n";
import { WalletInfo, QuickActions, TokenList } from "./components";
import type { AppComponentProps } from "@/OS/types/app";
import styles from "./WalletPanel.module.css";

// Helper to extract numeric chain ID from CAIP-2 format
function getNumericChainId(chainId: number | string | undefined): number | undefined {
  if (!chainId) return undefined;
  if (typeof chainId === "number") return chainId;
  if (typeof chainId === "string" && chainId.startsWith("eip155:")) {
    return parseInt(chainId.split(":")[1], 10);
  }
  return undefined;
}

export function WalletPanel({ windowId }: AppComponentProps) {
  const { t } = useTranslation();
  const { isConnected, address, chainName, chainId, connect, disconnect, forgetWallet } = useWallet();
  const { displayName, avatar, name: ensName } = useENS(address);
  
  // Extract numeric chain ID for API calls
  const numericChainId = getNumericChainId(chainId);
  
  // Fetch all token balances via Moralis
  const { native, tokens, isLoading, error } = useTokenBalances(
    address,
    numericChainId
  );

  // Disconnected state
  if (!isConnected || !address) {
    return (
      <div className={styles.container}>
        <div className={styles.disconnected}>
          <img src="/icons/wallet.svg" alt={t('common.wallet')} className={styles.iconLarge} />
          <h2 className={styles.title}>{t('wallet.connectWallet')}</h2>
          <p className={styles.description}>
            Connect your wallet to save your Berry OS customizations 
            across sessions and devices.
          </p>
          <button onClick={connect} className={styles.connectButton}>
            {t('wallet.connectWallet')}
          </button>
          <p className={styles.note}>
            Your wallet is only used as a key for saving preferences.
            <br />
            Berry OS never requests signatures or access to your funds.
          </p>
        </div>
      </div>
    );
  }

  // Connected state - Control Center style
  return (
    <div className={styles.container}>
      {/* Wallet Info Section */}
      <WalletInfo
        address={address}
        ensName={ensName || undefined}
        ensAvatar={avatar || undefined}
        chainName={chainName}
      />

      {/* Token Balances */}
      <TokenList
        native={native}
        tokens={tokens}
        isLoading={isLoading}
        error={error}
      />

      {/* Quick Actions */}
      <QuickActions address={address} />

      {/* Footer Actions */}
      <div className={styles.footer}>
        <button onClick={forgetWallet} className={styles.secondaryButton}>
          Forget Session
        </button>
        <button onClick={disconnect} className={styles.disconnectButton}>
          {t('wallet.disconnectWallet')}
        </button>
      </div>
    </div>
  );
}
