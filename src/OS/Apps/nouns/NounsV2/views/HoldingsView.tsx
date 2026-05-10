/**
 * Connected wallet's NounV2 holdings: balance, voting power, delegate, gallery.
 */

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { V2NounImage } from '../components/V2NounImage';
import { V2TxStatusBanner } from '../components/V2TxStatusBanner';
import { useV2Holdings } from '../hooks/useV2Holdings';
import { useV2Delegate } from '../hooks/useV2Delegate';
import { V2_ADDRESSES, v2AddressLink } from '../contracts';
import { truncateAddr } from '../utils/format';
import styles from './HoldingsView.module.css';

const ZERO = '0x0000000000000000000000000000000000000000';

export function HoldingsView() {
  const { address, isConnected } = useAccount();
  const holdings = useV2Holdings(address);
  const delegate = useV2Delegate();
  const [delegateInput, setDelegateInput] = useState('');

  const handleDelegate = () => {
    const target = (delegateInput.trim() || address) as `0x${string}` | undefined;
    if (!target || !isAddress(target)) return;
    delegate.delegate(target);
  };

  if (!isConnected) {
    return <div className={styles.empty}>Connect a wallet to view your Noun V2 holdings.</div>;
  }

  if (holdings.isLoading) {
    return <div className={styles.empty}>Loading holdings…</div>;
  }

  const data = holdings.data;
  const delegateSelf = data && address && data.delegate.toLowerCase() === address.toLowerCase();
  const delegateUnset = !data || data.delegate === ZERO;

  return (
    <div className={styles.view}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Owned</div>
          <div className={styles.statValue}>{data?.balance.toString() ?? '0'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Voting power</div>
          <div className={styles.statValue}>{data?.votes.toString() ?? '0'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Delegate</div>
          <div className={styles.statValueSmall}>
            {delegateUnset ? 'None' : delegateSelf ? 'Self' : truncateAddr(data?.delegate)}
          </div>
        </div>
      </div>

      {data && data.balance > BigInt(0) && data.votes === BigInt(0) && (
        <div className={styles.callout}>
          You hold {data.balance.toString()} NounV2 but your voting power is 0. Delegate to
          yourself to activate your vote.
        </div>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Delegate voting power</h3>
        <p className={styles.help}>
          Set who casts votes for your Noun V2s. Leave the field empty to delegate to yourself.
        </p>
        <div className={styles.delegateRow}>
          <input
            type="text"
            placeholder={address}
            value={delegateInput}
            onChange={(e) => setDelegateInput(e.target.value)}
            className={styles.delegateInput}
            disabled={delegate.isPending || delegate.isConfirming}
          />
          <button
            type="button"
            className={styles.delegateButton}
            disabled={delegate.isPending || delegate.isConfirming}
            onClick={handleDelegate}
          >
            {delegate.isPending || delegate.isConfirming ? 'Delegating…' : 'Delegate'}
          </button>
        </div>
        <V2TxStatusBanner
          hash={delegate.hash ?? null}
          isPending={delegate.isPending}
          isConfirming={delegate.isConfirming}
          isSuccess={delegate.isSuccess}
          error={delegate.error}
          onDismiss={delegate.reset}
          successMessage="Delegation confirmed."
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Your Noun V2s</h3>
        {!data || data.tokenIds.length === 0 ? (
          <div className={styles.empty}>You don&apos;t own any Noun V2s yet.</div>
        ) : (
          <div className={styles.grid}>
            {data.tokenIds.map((id) => (
              <div className={styles.card} key={id.toString()}>
                <V2NounImage tokenId={id} size={120} />
                <span className={styles.cardId}>#{id.toString()}</span>
                <a
                  className={styles.cardLink}
                  href={v2AddressLink(V2_ADDRESSES.token)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  contract ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
