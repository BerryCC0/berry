/**
 * Swap App
 * Trade Noun NFTs directly for Noun NFTs held by the NFTBackedToken contract.
 * The contract's ERC-20 side ($nouns) is intentionally not surfaced — that
 * side is effectively defunct.
 *
 * Flow: pick Nouns from your wallet (in) and from the pool (out), equal counts,
 * approve once, then swap.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { NounImage } from '@/app/lib/nouns/components';
import { useSwapPool, useTokenSwap, type SwapPoolNoun } from '@/app/lib/nouns/hooks';
import type { AppComponentProps } from '@/OS/types/app';
import styles from './Swap.module.css';

interface OwnedNoun {
  id: string;
  seed: {
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
  };
  svg?: string;
}

/**
 * Fetch Nouns currently owned by the connected wallet.
 * Reuses the same /api/nouns endpoint that other apps consume.
 */
function useOwnedNouns(address: `0x${string}` | undefined) {
  return useQuery<OwnedNoun[]>({
    queryKey: ['owned-nouns', address?.toLowerCase()],
    queryFn: async () => {
      if (!address) return [];
      const params = new URLSearchParams({
        owner: address.toLowerCase(),
        limit: '100',
        sort: 'oldest',
      });
      const res = await fetch(`/api/nouns?${params}`);
      if (!res.ok) throw new Error('Failed to fetch owned nouns');
      const json = await res.json();
      return (json.nouns || []).map((n: {
        id: number | string;
        background: number;
        body: number;
        accessory: number;
        head: number;
        glasses: number;
        svg?: string;
      }) => ({
        id: String(n.id),
        seed: {
          background: n.background,
          body: n.body,
          accessory: n.accessory,
          head: n.head,
          glasses: n.glasses,
        },
        svg: n.svg,
      }));
    },
    enabled: !!address,
    refetchInterval: 30_000,
  });
}

function NounTile({
  noun,
  selected,
  approvalState,
  onClick,
}: {
  noun: { id: string; seed: OwnedNoun['seed']; svg?: string };
  selected: boolean;
  /** Only shown for outgoing (owned) tiles when selected. */
  approvalState?: 'approved' | 'needsApproval';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.nounTile} ${selected ? styles.nounTileSelected : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {noun.svg ? (
        <img
          src={`data:image/svg+xml;base64,${noun.svg}`}
          alt={`Noun ${noun.id}`}
          width={80}
          height={80}
          className={styles.nounImg}
        />
      ) : (
        <NounImage seed={noun.seed} size={80} className={styles.nounImg} />
      )}
      <span className={styles.nounId}>#{noun.id}</span>
      {approvalState && (
        <span
          className={
            approvalState === 'approved' ? styles.badgeApproved : styles.badgeNeedsApproval
          }
          aria-label={approvalState === 'approved' ? 'approved' : 'needs approval'}
        >
          {approvalState === 'approved' ? '✓' : '!'}
        </span>
      )}
    </button>
  );
}

export function Swap(_props: AppComponentProps) {
  const { address } = useAccount();
  const [selectedOwned, setSelectedOwned] = useState<Set<string>>(new Set());
  const [selectedPool, setSelectedPool] = useState<Set<string>>(new Set());

  const { data: poolData, refetch: refetchPool } = useSwapPool(100, 0);
  const { data: ownedNouns, refetch: refetchOwned } = useOwnedNouns(address);

  // Stable bigint[] of outgoing token IDs for the swap hook. Sorted so the
  // identity is consistent regardless of selection order — keeps approval
  // reads from re-firing when the user toggles selections in different orders.
  const selectedInIds = useMemo(
    () =>
      Array.from(selectedOwned)
        .sort((a, b) => Number(a) - Number(b))
        .map(BigInt),
    [selectedOwned],
  );

  const swap = useTokenSwap(address, selectedInIds);

  // After a confirmed swap, the wallet and pool inventories have changed, so
  // refetch them and clear selections. After a confirmed approval, do nothing
  // here — the hook re-reads approval status on its own, the badge flips
  // green, and the action button advances to the next unapproved Noun (or
  // "Swap"). Selections must persist across the approval steps.
  useEffect(() => {
    if (!swap.isSuccess) return;
    if (swap.lastAction !== 'swap') return;
    refetchPool();
    refetchOwned();
    setSelectedOwned(new Set());
    setSelectedPool(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swap.isSuccess, swap.lastAction]);

  const togglePool = useCallback((id: string) => {
    setSelectedPool(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleOwned = useCallback((id: string) => {
    setSelectedOwned(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const poolNouns = poolData?.nouns ?? [];
  const ownedList = ownedNouns ?? [];
  const txInFlight = swap.isPending || swap.isConfirming;

  const inCount = selectedOwned.size;
  const outCount = selectedPool.size;
  const outIds = useMemo(() => Array.from(selectedPool).map(BigInt), [selectedPool]);
  const lengthMismatch = inCount !== outCount;
  const needsApproval = inCount > 0 && !swap.allApproved;
  const nextUnapprovedId = swap.unapprovedIds[0];
  const canSwap = !txInFlight && inCount > 0 && !lengthMismatch && !needsApproval;

  const summary = (() => {
    if (!address) return 'Connect a wallet to swap.';
    if (inCount === 0 && outCount === 0) {
      return 'Pick Nouns to send (your wallet) and Nouns to receive (the pool). Equal counts.';
    }
    if (lengthMismatch) {
      return `Trade ${inCount} → ${outCount} (counts must match)`;
    }
    if (needsApproval) {
      return `${swap.unapprovedIds.length} of ${inCount} Nouns still need approval. Each needs its own transaction.`;
    }
    return `Trade ${inCount} → ${outCount}`;
  })();

  return (
    <div className={styles.swap}>
      <div className={styles.body}>
        <section className={styles.column}>
          <h3 className={styles.columnTitle}>
            Your Nouns ({ownedList.length})
            <span className={styles.columnHint}>Pick Nouns to send</span>
          </h3>
          <div className={styles.grid}>
            {!address ? (
              <div className={styles.empty}>Connect a wallet to see your Nouns.</div>
            ) : ownedList.length === 0 ? (
              <div className={styles.empty}>You don&apos;t hold any Nouns.</div>
            ) : (
              ownedList.map(n => {
                const isSelected = selectedOwned.has(n.id);
                const approvalState = isSelected
                  ? swap.approvalStatus[n.id]
                    ? 'approved'
                    : 'needsApproval'
                  : undefined;
                return (
                  <NounTile
                    key={n.id}
                    noun={n}
                    selected={isSelected}
                    approvalState={approvalState}
                    onClick={() => toggleOwned(n.id)}
                  />
                );
              })
            )}
          </div>
        </section>

        <section className={styles.column}>
          <h3 className={styles.columnTitle}>
            Pool ({poolNouns.length})
            <span className={styles.columnHint}>Pick Nouns to receive</span>
          </h3>
          <div className={styles.grid}>
            {poolNouns.length === 0 ? (
              <div className={styles.empty}>No Nouns in the pool right now.</div>
            ) : (
              poolNouns.map((n: SwapPoolNoun) => (
                <NounTile
                  key={n.id}
                  noun={n}
                  selected={selectedPool.has(n.id)}
                  onClick={() => togglePool(n.id)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <div className={styles.actionPanel}>
        <div className={styles.actionSummary}>{summary}</div>
        {address && needsApproval && nextUnapprovedId ? (
          <button
            type="button"
            className={styles.primaryButton}
            disabled={txInFlight}
            onClick={() => swap.approveNoun(BigInt(nextUnapprovedId))}
          >
            {txInFlight ? 'Confirm in wallet…' : `Approve Noun #${nextUnapprovedId}`}
          </button>
        ) : (
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!canSwap}
            onClick={() => swap.swapNouns(selectedInIds, outIds)}
          >
            {txInFlight ? 'Confirm in wallet…' : 'Swap'}
          </button>
        )}
      </div>

      {swap.error && (
        <div className={styles.error}>{swap.error.message}</div>
      )}
      {swap.isSuccess && (
        <div className={styles.success}>
          {swap.lastAction === 'approve' ? 'Approval confirmed.' : 'Swap confirmed.'}
        </div>
      )}
    </div>
  );
}
