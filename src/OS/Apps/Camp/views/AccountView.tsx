/**
 * AccountView
 * Shows the connected user's governance profile
 * Displays wallet connection prompt when no wallet is connected
 */

'use client';

import { useAccount } from 'wagmi';
import { VoterDetailView } from './VoterDetailView';
import styles from './AccountView.module.css';

interface AccountViewProps {
  onNavigate: (path: string) => void;
}

export function AccountView({ onNavigate }: AccountViewProps) {
  const { address, isConnected } = useAccount();

  // Show wallet connection prompt if not connected
  if (!isConnected || !address) {
    return (
      <div className={styles.emptyState}>
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

  // Show voter detail view for connected wallet (no back button needed)
  return (
    <VoterDetailView 
      address={address} 
      onNavigate={onNavigate}
      onBack={() => {}} // No back button for account view
      showBackButton={false}
    />
  );
}

