/**
 * Account — the connected wallet's Noun V2 profile. Modelled on Camp's
 * AccountView: a wallet-connect prompt when disconnected, otherwise a profile
 * header + two-column layout (nouns represented / voting activity on the left,
 * voting-power stats + delegation on the right).
 */

'use client';

import { useMemo, useState, type SyntheticEvent } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { isAddress } from 'viem';
import { useEnsName, useEnsAvatar } from '@/OS/hooks/useEnsData';
import { addressToAvatar } from '@/OS/Apps/nouns/Camp/utils/addressAvatar';
import { V2NounImage } from '../components/V2NounImage';
import { V2TxStatusBanner } from '../components/V2TxStatusBanner';
import { useV2Holdings } from '../hooks/useV2Holdings';
import { useV2Delegate } from '../hooks/useV2Delegate';
import { V2_CONTRACTS, V2_CHAIN_ID, v2AddressLink } from '../contracts';
import { truncateAddr } from '../utils/format';
import styles from './HoldingsView.module.css';

const ZERO = '0x0000000000000000000000000000000000000000';

export function HoldingsView() {
  const { address, isConnected } = useAccount();
  const holdings = useV2Holdings(address);
  const delegate = useV2Delegate();
  const [delegateInput, setDelegateInput] = useState('');

  const ensName = useEnsName(address);
  const ensAvatar = useEnsAvatar(address);
  const fallbackAvatar = useMemo(() => (address ? addressToAvatar(address) : null), [address]);
  const avatarSrc = ensAvatar || fallbackAvatar;

  const { data: totalSupply } = useReadContract({
    address: V2_CONTRACTS.token.address,
    abi: V2_CONTRACTS.token.abi,
    functionName: 'totalSupply',
    chainId: V2_CHAIN_ID,
  });

  const handleAvatarError = (e: SyntheticEvent<HTMLImageElement>) => {
    if (fallbackAvatar && e.currentTarget.src !== fallbackAvatar) {
      e.currentTarget.src = fallbackAvatar;
    }
  };

  const handleDelegate = () => {
    const target = (delegateInput.trim() || address) as `0x${string}` | undefined;
    if (!target || !isAddress(target)) return;
    delegate.delegate(target);
  };

  // ── Disconnected: wallet-connect prompt (mirrors Camp's AccountView) ──
  if (!isConnected || !address) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyContent}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>⌐◨-◨</span>
          </div>
          <h2 className={styles.emptyTitle}>No Wallet Connected</h2>
          <p className={styles.emptyMessage}>
            Connect your wallet using the menu bar to view your Noun V2 profile — holdings,
            voting power, and delegation.
          </p>
          <div className={styles.hint}>
            <span>Click the wallet icon in the top menu bar to get started</span>
          </div>
        </div>
      </div>
    );
  }

  if (holdings.isLoading) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyContent}>Loading profile…</div>
      </div>
    );
  }

  const data = holdings.data;
  const votingPower = data ? Number(data.votes) : 0;
  const owned = data?.balance ?? BigInt(0);
  const supplyPct =
    totalSupply != null && Number(totalSupply) > 0
      ? ((votingPower / Number(totalSupply)) * 100).toFixed(1)
      : null;
  const delegateSelf = data && data.delegate.toLowerCase() === address.toLowerCase();
  const delegateUnset = !data || data.delegate === ZERO;
  const displayName = ensName ?? truncateAddr(address);

  return (
    <div className={styles.view}>
      {/* Profile header */}
      <div className={styles.profileHeader}>
        {avatarSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarSrc} alt="" className={styles.avatar} onError={handleAvatarError} />
        )}
        <div className={styles.profileMain}>
          <h1 className={styles.name}>{displayName}</h1>
          <a
            className={styles.address}
            href={v2AddressLink(address)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {truncateAddr(address)} ↗
          </a>
        </div>
      </div>

      <div className={styles.twoColumn}>
        {/* LEFT: nouns + activity */}
        <div className={styles.leftColumn}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Nouns represented ({data?.tokenIds.length ?? 0})
            </h3>
            {!data || data.tokenIds.length === 0 ? (
              <div className={styles.empty}>You don&apos;t own any Noun V2s yet.</div>
            ) : (
              <div className={styles.nounsGrid}>
                {data.tokenIds.map((id) => (
                  <div key={id.toString()} className={styles.nounCard}>
                    <V2NounImage tokenId={id} size={72} className={styles.nounImage} />
                    <span className={styles.nounId}>#{id.toString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Voting activity</h3>
            <div className={styles.empty}>No voting activity yet.</div>
          </section>
        </div>

        {/* RIGHT: stats + delegation */}
        <div className={styles.rightColumn}>
          <div className={styles.statsCard}>
            <div className={styles.statsHeader}>
              {votingPower} {votingPower === 1 ? 'noun' : 'nouns'} represented
              {supplyPct ? ` (~${supplyPct}% of supply)` : ''}
            </div>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Owned</span>
                <span className={styles.statValue}>{owned.toString()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Voting power</span>
                <span className={styles.statValue}>{votingPower}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Delegate</span>
                <span className={styles.statValueSmall}>
                  {delegateUnset ? 'None' : delegateSelf ? 'Self' : truncateAddr(data?.delegate)}
                </span>
              </div>
            </div>
          </div>

          {data && owned > BigInt(0) && data.votes === BigInt(0) && (
            <div className={styles.callout}>
              You hold {owned.toString()} NounV2 but your voting power is 0. Delegate to yourself
              to activate your vote.
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
        </div>
      </div>
    </div>
  );
}
