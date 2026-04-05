/**
 * useActivityItemData Hook
 * Encapsulates the data/ENS resolution layer from ActivityItem:
 * - Uses pre-loaded ENS data from API for actor, toAddress, winner, settler
 * - Falls back to batch ENS hook for reply/repost original posters (not pre-loaded)
 * - Pre-hook address resolution for reply/repost original posters
 * - Computed display values: displayName, timeAgo, nounId, repostInfo, replyInfo
 * - formatAddress helper
 * 
 * Performance: Eliminates 28+ individual wagmi ENS RPC calls per page by using
 * pre-indexed ENS data from the Ponder database via API joins.
 */

'use client';

import { useMemo } from 'react';
import { useBytecode } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { parseRepost, parseReply, type RepostInfo, type ReplyInfo } from '../utils/repostParser';
import { findOriginalPosterAddress, findRepostOriginalPosterAddress } from '../utils/activityUtils';
import { formatTimeAgo, formatAddress } from '../utils/formatUtils';
import { getContractLabel } from '../utils/knownContracts';
import { useEnsDataBatch } from './useEnsData';
import type { ActivityItem } from '../types';

export interface ActivityItemData {
  // ENS resolved names
  actorEns: string | null | undefined;
  actorAvatar: string | null | undefined;
  toAddressEns: string | null | undefined;
  winnerEns: string | null | undefined;
  settlerEns: string | null | undefined;
  replyOriginalPosterEns: string | null | undefined;
  repostOriginalPosterEns: string | null | undefined;
  
  // Resolved full addresses for reply/repost OPs
  replyOriginalPosterAddress: string | undefined;
  repostOriginalPosterAddress: string | undefined;
  
  // Computed display values
  displayName: string;
  timeAgo: string;
  nounId: number | undefined;
  repostInfo: RepostInfo | null;
  replyInfo: ReplyInfo | null;
  
  // Contract detection for noun_transfer items
  fromContractLabel: string | null; // e.g. "Arcade.xyz", "contract", or null (EOA)
  toContractLabel: string | null;   // same pattern
  isFromContract: boolean;
  isToContract: boolean;
  
  // Helper
  formatAddr: (address: string, ensName?: string | null) => string;
}

export function useActivityItemData(
  item: ActivityItem,
  allItems?: ActivityItem[]
): ActivityItemData {
  // Find original poster addresses BEFORE calling hooks (so hooks are always called in same order)
  const replyOriginalPosterAddress = findOriginalPosterAddress(item.reason, allItems);
  const repostOriginalPosterAddress = findRepostOriginalPosterAddress(item.reason, allItems);

  // Use pre-loaded ENS data from API when available
  // These fields are already populated by the activity API via SQL joins
  const actorEns = item.actorEns ?? null;
  const toAddressEns = item.toAddressEns ?? null;
  const winnerEns = item.winnerEns ?? null;
  const settlerEns = item.settlerEns ?? null;

  // For reply/repost original posters, we need to fetch ENS since these are
  // not pre-loaded by the API (they're derived from parsing the reason text)
  const addressesToFetch = useMemo(() => {
    const addrs: string[] = [];
    if (replyOriginalPosterAddress) addrs.push(replyOriginalPosterAddress);
    if (repostOriginalPosterAddress) addrs.push(repostOriginalPosterAddress);
    return addrs;
  }, [replyOriginalPosterAddress, repostOriginalPosterAddress]);

  const { data: ensMap } = useEnsDataBatch(addressesToFetch);

  // Get ENS names for reply/repost OPs from our batch fetch
  const replyOriginalPosterEns = replyOriginalPosterAddress
    ? ensMap[replyOriginalPosterAddress.toLowerCase()]?.name ?? null
    : null;
  const repostOriginalPosterEns = repostOriginalPosterAddress
    ? ensMap[repostOriginalPosterAddress.toLowerCase()]?.name ?? null
    : null;

  // For avatar, we don't have it pre-loaded currently, so it will be null
  // A future enhancement could add avatar to the API enrichment
  const actorAvatar = null;

  // --- Contract detection for noun_transfer items ---
  const isTransfer = item.type === 'noun_transfer';
  const isBulk = !!item.isBulkTransfer;

  // Check known list first (instant, no RPC)
  const fromKnownLabel = isTransfer && item.fromAddress ? getContractLabel(item.fromAddress) : null;
  const toKnownLabel = isTransfer && item.toAddress ? getContractLabel(item.toAddress) : null;

  // For unknown addresses, use useBytecode to detect if they are contracts.
  // Only query if it's a transfer, NOT already known, and we have the address.
  const shouldCheckFromBytecode = isTransfer && !isBulk && !fromKnownLabel && !!item.fromAddress;
  const shouldCheckToBytecode = isTransfer && !isBulk && !toKnownLabel && !!item.toAddress;

  const { data: fromBytecode } = useBytecode({
    address: shouldCheckFromBytecode ? (item.fromAddress as `0x${string}`) : undefined,
    chainId: mainnet.id,
  });
  const { data: toBytecode } = useBytecode({
    address: shouldCheckToBytecode ? (item.toAddress as `0x${string}`) : undefined,
    chainId: mainnet.id,
  });

  // Derive contract labels and flags
  const isFromContract = !!fromKnownLabel || (shouldCheckFromBytecode && !!fromBytecode && fromBytecode !== '0x');
  const isToContract = !!toKnownLabel || (shouldCheckToBytecode && !!toBytecode && toBytecode !== '0x');
  const fromContractLabel = fromKnownLabel ?? (isFromContract ? 'contract' : null);
  const toContractLabel = toKnownLabel ?? (isToContract ? 'contract' : null);

  const displayName = formatAddress(item.actor, actorEns);
  const timeAgo = formatTimeAgo(Number(item.timestamp));

  // Parse noun ID for image rendering
  const nounId = item.nounId ? parseInt(item.nounId, 10) : undefined;

  // Detect repost pattern in reason
  const repostInfo = useMemo(() => {
    if (!item.reason) return null;
    return parseRepost(item.reason);
  }, [item.reason]);

  // Detect reply pattern in reason  
  const replyInfo = useMemo(() => {
    if (!item.reason) return null;
    return parseReply(item.reason);
  }, [item.reason]);

  return {
    actorEns,
    actorAvatar,
    toAddressEns,
    winnerEns,
    settlerEns,
    replyOriginalPosterEns,
    repostOriginalPosterEns,
    replyOriginalPosterAddress,
    repostOriginalPosterAddress,
    displayName,
    timeAgo,
    nounId,
    repostInfo,
    replyInfo,
    fromContractLabel,
    toContractLabel,
    isFromContract,
    isToContract,
    formatAddr: formatAddress,
  };
}
