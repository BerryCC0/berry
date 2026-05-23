/**
 * Connected wallet's Food Nouns: balance, voting power, delegate, gallery.
 */

'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress } from 'viem';
import { FNNounImage } from '../components/FNNounImage';
import { TxStatusBanner } from '../components/TxStatusBanner';
import { useFNHoldings } from '../hooks/useFNHoldings';
import { FN_CONTRACTS, FN_CHAIN_ID, fnAddressLink } from '../contracts';
import { truncateAddr } from '../utils/format';
import styles from './HoldingsView.module.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function HoldingsView() {
  const { address, isConnected } = useAccount();
  const holdings = useFNHoldings(address);
  const [delegateInput, setDelegateInput] = useState('');

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const handleDelegate = () => {
    const target = (delegateInput.trim() || address) as `0x${string}` | undefined;
    if (!target || !isAddress(target)) return;
    writeContract({
      address: FN_CONTRACTS.token.address,
      abi: FN_CONTRACTS.token.abi,
      functionName: 'delegate',
      args: [target],
      chainId: FN_CHAIN_ID,
    });
  };

  if (!isConnected) {
    return (
      <div className={styles.empty}>Connect a wallet to view your Food Nouns.</div>
    );
  }

  if (holdings.isLoading) {
    return <div className={styles.empty}>Loading holdings…</div>;
  }

  const data = holdings.data;
  const delegateSelf = data && address && data.delegate.toLowerCase() === address.toLowerCase();

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
          <div className={styles.statValue}>
            {!data || data.delegate === ZERO_ADDRESS
              ? 'None'
              : delegateSelf
                ? 'Self'
                : truncateAddr(data.delegate)}
          </div>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Delegate voting power</h3>
        <p className={styles.help}>
          Set who casts votes for your Food Nouns. Leave the field empty to delegate to yourself.
        </p>
        <div className={styles.delegateRow}>
          <input
            type="text"
            placeholder={address}
            value={delegateInput}
            onChange={(e) => setDelegateInput(e.target.value)}
            className={styles.delegateInput}
            disabled={isPending || isConfirming}
          />
          <button
            type="button"
            className={styles.delegateButton}
            disabled={isPending || isConfirming}
            onClick={handleDelegate}
          >
            {isPending || isConfirming ? 'Delegating…' : 'Delegate'}
          </button>
        </div>
        <TxStatusBanner
          hash={hash ?? null}
          isPending={isPending}
          isConfirming={isConfirming}
          isSuccess={isSuccess}
          error={writeError ?? confirmError ?? null}
          onDismiss={reset}
          successMessage="Delegation confirmed."
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Your Food Nouns</h3>
        {!data || data.tokenIds.length === 0 ? (
          <div className={styles.empty}>You don&apos;t own any Food Nouns yet.</div>
        ) : (
          <div className={styles.grid}>
            {data.tokenIds.map((id) => (
              <div className={styles.card} key={id.toString()}>
                <FNNounImage tokenId={id} size={120} />
                <span className={styles.cardId}>#{id.toString()}</span>
                <a
                  className={styles.cardLink}
                  href={fnAddressLink(FN_CONTRACTS.token.address)}
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
