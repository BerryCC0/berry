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
    const withRecipient = (text: string, to: string | undefined): ReactNode => {
      if (!to) return text;
      const addr = (
        <AddressWithENS address={to} className={styles.txSummaryRecipient} />
      );
      return (
        <>
          {text} to{' '}
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
    
    // Aggregators for transfers
    let ethTotal = 0;
    let ethCount = 0;
    const tokenTotals: Record<string, { total: number; count: number; sources: Set<string> }> = {};
    const nounTransfers: DecodedTransaction[] = [];
    
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

      // Cancel / redirect / recover — aggregate as stream cancellations.
      // The recoverTokens leg of a cancel pair gets folded into the cancel
      // entry so a 2-action cancel reads as a single "Cancel" item.
      if (
        title === 'Cancel payment stream' ||
        title === 'Return unvested funds to Treasury' ||
        title === 'Redirect unvested funds' ||
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
      
      // Noun NFT transfers: "Transfer Noun 123" — collect for swap detection below
      if (title.startsWith('Transfer Noun')) {
        nounTransfers.push(tx);
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
          details: `Swap Noun ${givenId} for Noun ${receivedId}`,
        });
      } else {
        // Not a swap — show individually
        for (const tx of nounTransfers) {
          groups.push({
            type: 'Noun Transfer',
            count: 1,
            details: withRecipient(
              tx.title,
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
            tx.title,
            tx.params?.to as string | undefined,
          ),
        });
      }
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
            <span className={styles.txSummaryTitle}>
              {item.type === 'Token Transfer' && 'Requesting '}
              {item.type === 'ETH Transfer' && 'Requesting '}
              {item.type === 'Stream'}
              {item.type === 'Noun Transfer'}
              {item.type === 'Noun Swap'}
              {item.type === 'Approval'}
              {item.type === 'Delegation'}
              {item.type === 'Contract Call'}
              {item.details}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
