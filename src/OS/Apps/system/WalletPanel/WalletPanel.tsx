"use client";

/**
 * WalletPanel - OS App for Wallet Management
 *
 * Control Center-style wallet interface, twin surface to Names.
 * Both surfaces share IdentityShell + IdentityHeader so the avatar,
 * ENS, address, and chain row don't visibly change during a swap.
 * The body below the shared header is what differs between surfaces.
 */

import { useAppKit } from "@reown/appkit/react";
import { useWallet } from "@/OS/hooks/useWallet";
import { useTokenBalances } from "@/OS/hooks/useTokenBalances";
import { useTranslation } from "@/OS/lib/i18n";
import { IdentityShell } from "@/OS/Apps/system/_identity";
import { QuickActions, TokenList } from "./components";
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
  const { isConnected, address, chainId, connect, disconnect, forgetWallet } = useWallet();
  const { open: openAppKit } = useAppKit();

  const numericChainId = getNumericChainId(chainId);

  const { native, tokens, isLoading, error } = useTokenBalances(
    address,
    numericChainId
  );

  // Disconnected state — IdentityShell still renders so the SurfaceToggle is reachable.
  if (!isConnected || !address) {
    return (
      <IdentityShell windowId={windowId} surface="wallet">
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
      </IdentityShell>
    );
  }

  return (
    <IdentityShell windowId={windowId} surface="wallet">
      <div className={styles.container}>
        <TokenList
          native={native}
          tokens={tokens}
          isLoading={isLoading}
          error={error}
        />
        <QuickActions address={address} />
        <div className={styles.footer}>
          <button
            onClick={() => openAppKit({ view: "Account" })}
            className={styles.secondaryButton}
          >
            Manage Wallets
          </button>
          <button onClick={forgetWallet} className={styles.secondaryButton}>
            Forget Session
          </button>
          <button onClick={disconnect} className={styles.disconnectButton}>
            {t('wallet.disconnectWallet')}
          </button>
        </div>
      </div>
    </IdentityShell>
  );
}
