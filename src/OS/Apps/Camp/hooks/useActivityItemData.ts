/**
 * useActivityItemData Hook
 * Encapsulates the data/ENS resolution layer from ActivityItem:
 * - All ENS name/avatar hook calls (actor, toAddress, winner, settler, reply OP, repost OP)
 * - Pre-hook address resolution for reply/repost original posters
 * - Computed display values: displayName, timeAgo, nounId, repostInfo, replyInfo
 * - formatAddress helper
 */

'use client';

import { useMemo } from 'react';
import { useEnsName, useEnsAvatar, useBytecode } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { parseRepost, parseReply, type RepostInfo, type ReplyInfo } from '../utils/repostParser';
import { findOriginalPosterAddress, findRepostOriginalPosterAddress } from '../utils/activityUtils';
import { formatTimeAgo, formatAddress } from '../utils/formatUtils';
import { getContractLabel } from '../utils/knownContracts';
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

  const { data: actorEns } = useEnsName({
    address: item.actor as `0x${string}`,
    chainId: mainnet.id,
  });

  const { data: actorAvatar } = useEnsAvatar({
    name: actorEns || undefined,
    chainId: mainnet.id,
  });

  const { data: toAddressEns } = useEnsName({
    address: item.toAddress as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  const { data: winnerEns } = useEnsName({
    address: item.winner as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  const { data: settlerEns } = useEnsName({
    address: item.settler as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  // Resolve ENS for the original poster (if this is a reply)
  const { data: replyOriginalPosterEns } = useEnsName({
    address: replyOriginalPosterAddress as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  // Resolve ENS for the original poster (if this is a repost)
  const { data: repostOriginalPosterEns } = useEnsName({
    address: repostOriginalPosterAddress as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

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
