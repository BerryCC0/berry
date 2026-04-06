/**
 * AccountView
 * Shows the connected user's governance profile
 * Displays wallet connection prompt when no wallet is connected
 */

'use client';

import { useAccount } from 'wagmi';
import { VoterDetailView } from './VoterDetailView';
import { Toolbar, useToolbar, ToolbarBack, ToolbarTitle } from '../components/CampToolbar';
import type { CampToolbarContext } from '../Camp';
import styles from './AccountView.module.css';

interface AccountViewProps {
  onNavigate: (path: string) => void;
  onBack: () => void;
  toolbar?: CampToolbarContext;
}

export function AccountView({ onNavigate, onBack, toolbar }: AccountViewProps) {
  const { address, isConnected } = useAccount();
  const { isModern } = useToolbar();
  const tb = toolbar;

  // Show wallet connection prompt if not connected
  if (!isConnected || !address) {
    return (
      <div className={styles.emptyState}>
        {tb && (
          <Toolbar
            leading={
              <>
                <ToolbarBack onClick={onBack} styles={tb.styles} />
                <ToolbarTitle styles={tb.styles}>Account</ToolbarTitle>
              </>
            }
          />
        )}
        <div className={styles.content}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>⌐◨-◨</span>
          </div>
          <h2 className={styles.title}>No Wallet Connected</h2>
          <p className={styles.message}>
            Connect your wallet using the Menu Bar to view your governance profile, 
            voting history, and delegation status.
          </p>
          <div className={styles.hint}>
            <span className={styles.hintText}>
              Click the wallet icon in the top menu bar to get started
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show voter detail view for connected wallet
  return (
    <VoterDetailView
      address={address}
      onNavigate={onNavigate}
      onBack={onBack}
      showBackButton={true}
      isOwnAccount={true}
      toolbar={toolbar}
    />
  );
}

