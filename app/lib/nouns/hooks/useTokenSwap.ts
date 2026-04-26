/**
 * Token Swap Hook
 * Per-token approval + NFT-for-NFT swap on the NFTBackedToken contract.
 *
 *   - approveNoun(tokenId): approve(swapContract, tokenId) on the Nouns Token.
 *     Single-token approval only; setApprovalForAll is intentionally not used
 *     so a compromised contract cannot drain the user's other Nouns.
 *   - swapNouns(tokensIn, tokensOut): trade equal-length lists of Noun NFTs.
 *
 * Pre-existing setApprovalForAll grants (made from other clients) are still
 * respected — if the user has already approved-for-all, none of their tokens
 * will show as "needs approval".
 *
 * No client-incentive support — this contract is not in the Nouns DAO client
 * rewards registry, so BERRY_CLIENT_ID is not passed.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { NOUNS_CONTRACTS, NOUNS_ADDRESSES } from '../contracts';

type SwapAction = 'approve' | 'swap' | null;

export interface UseTokenSwapResult {
  /** Per-token approval status, keyed by stringified tokenId. True means the swap contract can pull this Noun. */
  approvalStatus: Record<string, boolean>;
  /** Selected tokenIds (as strings) that still need approval, in selection order. */
  unapprovedIds: string[];
  /** True when every selected token is approved (or the user has a prior approval-for-all). */
  allApproved: boolean;
  /** True while the approval reads are pending. */
  isApprovalLoading: boolean;
  /** Approve a single Noun for the swap contract. */
  approveNoun: (tokenId: bigint) => void;
  /** NFT-for-NFT swap. tokensIn and tokensOut must be equal length, and every tokenIn must be approved. */
  swapNouns: (tokensIn: bigint[], tokensOut: bigint[]) => void;
  /** Which kind of write was last initiated. Lets the caller distinguish "approval confirmed" from "swap confirmed". */
  lastAction: SwapAction;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  hash: `0x${string}` | undefined;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Combined approve + swap hook. Pass the connected account and the currently
 * selected outgoing tokenIds — the hook re-reads approval state whenever the
 * selection changes.
 */
export function useTokenSwap(
  account: `0x${string}` | undefined,
  selectedInIds: bigint[],
): UseTokenSwapResult {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const [lastAction, setLastAction] = useState<SwapAction>(null);

  // One isApprovedForAll read + one getApproved read per selected token.
  // useReadContracts batches these into a single multicall.
  const reads = useMemo(() => {
    if (!account) return [];
    const list: Array<{
      address: `0x${string}`;
      abi: typeof NOUNS_CONTRACTS.token.abi;
      functionName: 'isApprovedForAll' | 'getApproved';
      args: readonly [`0x${string}`, `0x${string}`] | readonly [bigint];
    }> = [
      {
        address: NOUNS_CONTRACTS.token.address,
        abi: NOUNS_CONTRACTS.token.abi,
        functionName: 'isApprovedForAll',
        args: [account, NOUNS_ADDRESSES.tokenSwap] as const,
      },
    ];
    for (const id of selectedInIds) {
      list.push({
        address: NOUNS_CONTRACTS.token.address,
        abi: NOUNS_CONTRACTS.token.abi,
        functionName: 'getApproved',
        args: [id] as const,
      });
    }
    return list;
  }, [account, selectedInIds]);

  const {
    data: readResults,
    isLoading: isApprovalLoading,
    refetch: refetchApprovals,
  } = useReadContracts({
    contracts: reads,
    allowFailure: true,
    query: { enabled: reads.length > 0 },
  });

  const { isLoading: isConfirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash });

  // Refresh approval state once a transaction confirms.
  useEffect(() => {
    if (isSuccess) refetchApprovals();
  }, [isSuccess, refetchApprovals]);

  const { approvalStatus, unapprovedIds, allApproved } = useMemo(() => {
    const status: Record<string, boolean> = {};
    if (!account || selectedInIds.length === 0) {
      return { approvalStatus: status, unapprovedIds: [], allApproved: true };
    }
    if (!readResults) {
      return { approvalStatus: status, unapprovedIds: [], allApproved: false };
    }
    // wagmi narrows the discriminated union to `never` for dynamically-built
    // contract arrays. The runtime shapes are stable and validated below.
    type ReadItem = { status: 'success'; result: unknown } | { status: 'failure' };
    const items = readResults as readonly ReadItem[];

    const first = items[0];
    const isApprovedForAll = first?.status === 'success' && first.result === true;
    const swapAddrLower = NOUNS_ADDRESSES.tokenSwap.toLowerCase();
    const unapproved: string[] = [];
    for (let i = 0; i < selectedInIds.length; i++) {
      const id = selectedInIds[i].toString();
      const r = items[i + 1];
      const result = r?.status === 'success' ? r.result : null;
      const approvedDirect =
        typeof result === 'string' &&
        result !== ZERO_ADDRESS &&
        result.toLowerCase() === swapAddrLower;
      const ok = isApprovedForAll || approvedDirect;
      status[id] = ok;
      if (!ok) unapproved.push(id);
    }
    return { approvalStatus: status, unapprovedIds: unapproved, allApproved: unapproved.length === 0 };
  }, [account, selectedInIds, readResults]);

  const approveNoun = (tokenId: bigint) => {
    reset();
    setLastAction('approve');
    writeContract({
      address: NOUNS_CONTRACTS.token.address,
      abi: NOUNS_CONTRACTS.token.abi,
      functionName: 'approve',
      args: [NOUNS_ADDRESSES.tokenSwap, tokenId],
    });
  };

  const swapNouns = (tokensIn: bigint[], tokensOut: bigint[]) => {
    reset();
    setLastAction('swap');
    writeContract({
      address: NOUNS_CONTRACTS.tokenSwap.address,
      abi: NOUNS_CONTRACTS.tokenSwap.abi,
      functionName: 'swap',
      args: [tokensIn, tokensOut],
    });
  };

  return {
    approvalStatus,
    unapprovedIds,
    allApproved,
    isApprovalLoading,
    approveNoun,
    swapNouns,
    lastAction,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || confirmError,
    hash,
  };
}
