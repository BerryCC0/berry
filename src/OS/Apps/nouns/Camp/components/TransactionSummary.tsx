/**
 * TransactionSummary
 * Shows a summary box of what a proposal requests (ETH transfers, streams, etc.)
 */

'use client';

import { useMemo, type ReactNode } from 'react';
import { type DecodedTransaction } from '../utils/transactionDecoder';
import { useDecodedTransactions } from '../hooks/useDecodedTransactions';
import { AddressWithENS } from './SimulationStatus/SimulationStatus';
import { VoterLink } from './VoterLink';
import { NftPurchaseCard } from './NftPurchaseCard';
import { NounImageById } from '@/app/lib/nouns/components';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns/contracts';
import styles from './TransactionSummary.module.css';

interface TransactionSummaryProps {
  actions: { target: string; value: string; signature: string; calldata: string }[];
  /**
   * Optional navigation hook. When provided, recipient addresses become
   * clickable links to that voter's Camp profile.
   */
  onNavigate?: (path: string) => void;
}

/**
 * Strip a trailing recipient address from a description string.
 *
 * Many action `describe()` methods embed `to ${recipient}` in their
 * description so the raw text reads naturally on its own. When the renderer
 * also appends an ENS-resolved chip the result reads "... to 0xabc… to
 * ian.eth" with the doubled "to". Pulling the trailing address off here lets
 * actions stay clean (no special-casing per-action) and the chip becomes
 * the single rendering of the destination.
 *
 * Matches the most common shapes our actions produce:
 *   "Foo - to 0x{40 hex}"
 *   "Foo to 0x{40 hex}"
 *   "to 0x{40 hex}"
 */
function stripTrailingAddress(text: string): string {
  // ` - to 0x...` (the contract-call branch concats title + " - " + description)
  let cleaned = text.replace(/\s*[-–]\s*to\s+0x[a-fA-F0-9]{40}\s*$/i, '');
  if (cleaned !== text) return cleaned;
  // ` to 0x...` at the end without the dash
  cleaned = text.replace(/\s+to\s+0x[a-fA-F0-9]{40}\s*$/i, '');
  if (cleaned !== text) return cleaned;
  // Standalone "to 0x..." (e.g. description was JUST that)
  return text.replace(/^to\s+0x[a-fA-F0-9]{40}\s*$/i, '').trim();
}

/** Parse a formatted number like "21.2K" -> 21200, "1.50M" -> 1500000, "1,500" -> 1500 */
function parseFormattedNumber(str: string): number {
  const cleaned = str.replace(/,/g, '');
  const match = cleaned.match(/^([\d.]+)(K|M)?$/);
  if (!match) return 0;
  let num = parseFloat(match[1]);
  if (match[2] === 'K') num *= 1000;
  if (match[2] === 'M') num *= 1000000;
  return num;
}

/** Format an aggregated number back to K/M notation */
function formatAggregatedAmount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function TransactionSummary({ actions, onNavigate }: TransactionSummaryProps) {
  const decodedTransactions = useDecodedTransactions(actions);
  
  // Group similar transactions for summary, aggregating transfer amounts.
  // `details` is ReactNode so individual entries can render an inline
  // AddressWithENS for the recipient (e.g. "Delegate ENS voting power to
  // gramajo.eth"); aggregated entries stay as plain strings.
  const summary = useMemo(() => {
    const groups: { type: string; count: number; details: ReactNode }[] = [];

    // Renders "<text> to <ENS-resolved address>" inline. When onNavigate is
    // provided the recipient is a VoterLink — hover shows the voter mini
    // profile, click navigates to their Camp page.
    //
    // Strips a trailing "to 0x..." (with or without a preceding " - ")
    // from the `text` before appending the chip — many action `describe()`
    // methods stuff `to ${recipient}` into their description so the legacy
    // raw rendering still reads naturally, but here that becomes a
    // duplicate alongside the ENS chip ("... to 0xabc… to ian.eth"). Stripping
    // it at the seam keeps every existing action def clean and the rendered
    // output single-source-of-truth.
    const withRecipient = (text: ReactNode, to: string | undefined): ReactNode => {
      if (!to) return text;
      const cleaned =
        typeof text === 'string' ? stripTrailingAddress(text) : text;
      const addr = (
        <AddressWithENS
          address={to}
          className={styles.txSummaryRecipient}
          showAvatar
        />
      );
      return (
        <>
          {cleaned} to{' '}
          <VoterLink
            address={to}
            onNavigate={onNavigate}
            className={styles.txSummaryRecipientLink}
          >
            {addr}
          </VoterLink>
        </>
      );
    };

    // Renders a small Noun image inline after a Noun ID — used in Noun
    // transfer / swap summary lines so readers see what's actually being
    // moved without clicking through.
    const nounIdWithImage = (nounId: string | number | undefined): ReactNode => {
      if (nounId === undefined || nounId === null) return null;
      const idNum = typeof nounId === 'string' ? parseInt(nounId, 10) : nounId;
      if (Number.isNaN(idNum)) return <>{String(nounId)}</>;
      return (
        <>
          {idNum}
          <NounImageById
            id={idNum}
            size={24}
            className={styles.txSummaryNounImage}
          />
        </>
      );
    };

    // Render a Noun-transfer line preserving the action's original title
    // prefix ("Transfer Noun ", "Send Noun #") and inserting the Noun art
    // inline after the ID. Falls back to the raw title if the action didn't
    // surface a nounId in params (defensive — every Noun transfer should).
    const renderNounTransferLabel = (tx: DecodedTransaction): ReactNode => {
      const nounId = tx.params?.nounId as string | undefined;
      if (!nounId) return tx.title;
      if (tx.title.startsWith('Send Noun')) {
        return <>Send Noun #{nounIdWithImage(nounId)}</>;
      }
      // Legacy decoder ("Transfer Noun 123")
      return <>Transfer Noun {nounIdWithImage(nounId)}</>;
    };
    
    // Aggregators for transfers
    let ethTotal = 0;
    let ethCount = 0;
    const tokenTotals: Record<string, { total: number; count: number; sources: Set<string> }> = {};
    const nounTransfers: DecodedTransaction[] = [];
    // NFT purchases (Seaport fulfillments). Collected here so we can render
    // them as a single "Buy N Nouns for X ETH" grid when there's more than
    // one — single buys still render as a standalone card.
    interface NftPurchaseEntry {
      contract?: string;
      tokenId?: string;
      ethPriceStr: string;
      seller?: string;
      title: string;
      description?: string;
    }
    const nftPurchases: NftPurchaseEntry[] = [];
    
    for (let i = 0; i < decodedTransactions.length; i++) {
      const tx = decodedTransactions[i];

      // Re-stream pattern (4-action lookahead): cancel + recover→treasury +
      // createStream + fund-stream. Collapse into a single "Re-stream" entry
      // so the summary doesn't double-count cancel and create halves.
      if (i + 3 < decodedTransactions.length) {
        const a = decodedTransactions[i];
        const b = decodedTransactions[i + 1];
        const c = decodedTransactions[i + 2];
        const d = decodedTransactions[i + 3];
        if (
          a.title === 'Cancel payment stream' &&
          b.title === 'Return unvested funds to Treasury' &&
          c.title.startsWith('Stream ') &&
          (d.title === 'Fund Stream Contract' || d.title.startsWith('Fund stream with '))
        ) {
          groups.push({
            type: 'Re-stream',
            count: 1,
            details: `Cancel + ${c.title}${c.description ? ` (${c.description})` : ''}`,
          });
          i += 3; // skip the remaining 3 actions of the re-stream sequence
          continue;
        }
      }

      const title = tx.title;

      // ETH transfers: "Transfer X ETH" (but not WETH, STETH, etc.)
      if (title.startsWith('Transfer') && title.endsWith(' ETH') && !title.includes('Noun')) {
        const amountStr = title.replace(/^Transfer\s+/, '').replace(/\s+ETH$/, '');
        ethTotal += parseFormattedNumber(amountStr);
        ethCount++;
        continue;
      }
      
      // Token transfers: "Transfer AMOUNT SYMBOL"
      if (title.startsWith('Transfer') && !title.includes('Noun')) {
        const rest = title.replace(/^Transfer\s+/, '');
        const match = rest.match(/^([\d,.]+[KM]?)\s+(\w+)$/);
        if (match) {
          const [, amountStr, symbol] = match;
          const source = tx.description?.includes('Payer') ? 'Payer' : 'Treasury';
          if (!tokenTotals[symbol]) {
            tokenTotals[symbol] = { total: 0, count: 0, sources: new Set() };
          }
          tokenTotals[symbol].total += parseFormattedNumber(amountStr);
          tokenTotals[symbol].count++;
          tokenTotals[symbol].sources.add(source);
          continue;
        }
      }
      
      // Streams
      if (title.startsWith('Stream')) {
        const existing = groups.find(g => g.type === 'Stream');
        if (existing) {
          existing.count++;
          existing.details = `${existing.count} streams`;
        } else {
          groups.push({ type: 'Stream', count: 1, details: title + (tx.description ? ` (${tx.description})` : '') });
        }
        continue;
      }
      
      // Fund Stream Contract (auxiliary to streams)
      if (title === 'Fund Stream Contract' || title.startsWith('Fund stream with ')) {
        // These are funding transactions for streams — skip from summary
        // since the stream entry already describes the payment
        continue;
      }

      // Cancel / recover — aggregate as stream cancellations. The
      // recoverTokens leg of a cancel pair gets folded into the cancel
      // entry so a 2-action cancel reads as a single "Cancel" item.
      //
      // 'Redirect unvested funds' is intentionally NOT in this list: each
      // redirect has a meaningful amount + destination chip that aggregation
      // would discard. It falls through to the Contract Call branch below,
      // which renders "Redirect unvested funds - Redirects {amount} {symbol}
      // to <ENS chip>".
      if (
        title === 'Cancel payment stream' ||
        title === 'Return unvested funds to Treasury' ||
        title.startsWith('Recover stream funds') ||
        title.endsWith(' from stream')
      ) {
        const existing = groups.find(g => g.type === 'Stream Cancel');
        if (existing) {
          existing.count++;
          existing.details = `${existing.count} stream actions`;
        } else {
          groups.push({ type: 'Stream Cancel', count: 1, details: title });
        }
        continue;
      }
      
      // Noun NFT transfers: collect for swap detection below.
      //   - "Transfer Noun 123" — legacy decoder path
      //   - "Send Noun #123"    — action-registry path (noun-transfer.ts)
      if (title.startsWith('Transfer Noun') || title.startsWith('Send Noun')) {
        nounTransfers.push(tx);
        continue;
      }

      // ERC-20 swap (Uniswap V3 etc.) — "Swap X TokenIn for TokenOut"
      if (title.startsWith('Swap ') && !title.startsWith('Swap Noun')) {
        groups.push({
          type: 'Swap',
          count: 1,
          details: tx.description ? `${title} — ${tx.description}` : title,
        });
        continue;
      }

      // NFT marketplace buy — collect for grouped rendering after the loop.
      // A single buy renders as one card; multiple collapse into a header +
      // grid so a 4-Noun sweep doesn't dominate the page vertically.
      if (title.startsWith('Buy NFT')) {
        const priceMatch = title.match(/for ([\d.]+) ETH/);
        nftPurchases.push({
          contract: tx.params?.contract,
          tokenId: tx.params?.nftId,
          ethPriceStr: priceMatch ? priceMatch[1] : '?',
          seller: tx.params?.to,
          title,
          description: tx.description,
        });
        continue;
      }

      // Approvals
      if (title.startsWith('Approve')) {
        groups.push({
          type: 'Approval',
          count: 1,
          details: withRecipient(title, tx.params?.to as string | undefined),
        });
        continue;
      }

      // Delegation
      if (title.startsWith('Delegate')) {
        groups.push({
          type: 'Delegation',
          count: 1,
          details: withRecipient(title, tx.params?.to as string | undefined),
        });
        continue;
      }

      // Everything else: Contract Call
      groups.push({
        type: 'Contract Call',
        count: 1,
        details: withRecipient(
          title + (tx.description ? ` - ${tx.description}` : ''),
          tx.params?.to as string | undefined,
        ),
      });
    }
    
    // Detect Noun swaps: if two Noun transfers where one sends TO the treasury
    // and the other sends FROM the treasury to the same person, it's a swap
    if (nounTransfers.length === 2) {
      const treasuryAddr = NOUNS_ADDRESSES.treasury.toLowerCase();
      const treasuryV1Addr = NOUNS_ADDRESSES.treasuryV1.toLowerCase();
      const isTreasury = (addr: string) =>
        addr.toLowerCase() === treasuryAddr || addr.toLowerCase() === treasuryV1Addr;

      const toTreasury = nounTransfers.find(tx => isTreasury(tx.params?.to || ''));
      const fromTreasury = nounTransfers.find(tx => isTreasury(tx.params?.from || ''));

      if (toTreasury && fromTreasury && toTreasury !== fromTreasury) {
        const givenId = toTreasury.params?.nounId;
        const receivedId = fromTreasury.params?.nounId;
        groups.push({
          type: 'Noun Swap',
          count: 1,
          details: (
            <>
              Swap Noun {nounIdWithImage(givenId)} for Noun{' '}
              {nounIdWithImage(receivedId)}
            </>
          ),
        });
      } else {
        // Not a swap — show individually
        for (const tx of nounTransfers) {
          groups.push({
            type: 'Noun Transfer',
            count: 1,
            details: withRecipient(
              renderNounTransferLabel(tx),
              tx.params?.to as string | undefined,
            ),
          });
        }
      }
    } else {
      for (const tx of nounTransfers) {
        groups.push({
          type: 'Noun Transfer',
          count: 1,
          details: withRecipient(
            renderNounTransferLabel(tx),
            tx.params?.to as string | undefined,
          ),
        });
      }
    }

    // NFT purchases: single buy renders as a card; multiple collapse into
    // a header + grid so a sweep proposal doesn't dominate the page.
    if (nftPurchases.length === 1) {
      const p = nftPurchases[0];
      groups.push({
        type: 'NFT Purchase',
        count: 1,
        details:
          p.contract && p.tokenId ? (
            <NftPurchaseCard
              contract={p.contract}
              tokenId={p.tokenId}
              ethPriceStr={p.ethPriceStr}
              seller={p.seller}
              onNavigate={onNavigate}
            />
          ) : (
            p.description ? `${p.title} — ${p.description}` : p.title
          ),
      });
    } else if (nftPurchases.length > 1) {
      const nounsTokenAddr = NOUNS_ADDRESSES.token.toLowerCase();
      const allNouns = nftPurchases.every(
        (p) => p.contract?.toLowerCase() === nounsTokenAddr,
      );
      const totalEth = nftPurchases.reduce(
        (sum, p) => sum + (parseFloat(p.ethPriceStr) || 0),
        0,
      );
      const totalStr = totalEth.toFixed(2).replace(/\.?0+$/, '') || '0';
      const noun = allNouns ? 'Nouns' : 'NFTs';
      groups.push({
        type: 'NFT Sweep',
        count: nftPurchases.length,
        details: (
          <div className={styles.nftSweep}>
            <div className={styles.nftSweepHeader}>
              Buy {nftPurchases.length} {noun} for {totalStr} ETH
            </div>
            <div className={styles.nftSweepGrid}>
              {nftPurchases.map((p, i) =>
                p.contract && p.tokenId ? (
                  <NftPurchaseCard
                    key={i}
                    contract={p.contract}
                    tokenId={p.tokenId}
                    ethPriceStr={p.ethPriceStr}
                    seller={p.seller}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <div key={i} className={styles.nftSweepFallback}>
                    {p.description ? `${p.title} — ${p.description}` : p.title}
                  </div>
                ),
              )}
            </div>
          </div>
        ),
      });
    }

    // Build aggregated transfer groups and prepend them (transfers shown first)
    const transferGroups: typeof groups = [];
    
    if (ethCount > 0) {
      const total = formatAggregatedAmount(ethTotal);
      transferGroups.push({
        type: 'ETH Transfer',
        count: ethCount,
        details: ethCount > 1 ? `${total} ETH (${ethCount} transfers)` : `${total} ETH`,
      });
    }
    
    for (const [symbol, data] of Object.entries(tokenTotals)) {
      const total = formatAggregatedAmount(data.total);
      const sourceStr = data.sources.size === 1 ? ` via ${[...data.sources][0]}` : '';
      transferGroups.push({
        type: 'Token Transfer',
        count: data.count,
        details: data.count > 1
          ? `${total} ${symbol}${sourceStr} (${data.count} transfers)`
          : `${total} ${symbol}${sourceStr}`,
      });
    }
    
    return [...transferGroups, ...groups];
  }, [decodedTransactions, onNavigate]);
  
  if (decodedTransactions.length === 0) return null;
  
  return (
    <div className={styles.txSummary}>
      <div className={styles.txSummaryContent}>
        {summary.map((item, i) => (
          <div key={i} className={styles.txSummaryItem}>
            {item.type === 'NFT Purchase' || item.type === 'NFT Sweep' ? (
              // NFT cards / sweep grids are block-level; render directly
              // without the inline-text wrapper.
              item.details
            ) : (
              <span className={styles.txSummaryTitle}>
                {item.type === 'Token Transfer' && 'Requesting '}
                {item.type === 'ETH Transfer' && 'Requesting '}
                {item.details}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
