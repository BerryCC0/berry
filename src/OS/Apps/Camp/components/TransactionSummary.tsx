/**
 * TransactionSummary
 * Shows a summary box of what a proposal requests (ETH transfers, streams, etc.)
 */

'use client';

import { useMemo } from 'react';
import { decodeTransactions } from '../utils/transactionDecoder';
import styles from './TransactionSummary.module.css';

interface TransactionSummaryProps {
  actions: { target: string; value: string; signature: string; calldata: string }[];
}

export function TransactionSummary({ actions }: TransactionSummaryProps) {
  const decodedTransactions = useMemo(() => {
    return decodeTransactions(actions);
  }, [actions]);
  
  // Group similar transactions for summary
  const summary = useMemo(() => {
    const groups: { type: string; count: number; details: string }[] = [];
    
    for (const tx of decodedTransactions) {
      const title = tx.title;
      
      if (title.startsWith('Transfer') && title.includes('ETH')) {
        const existing = groups.find(g => g.type === 'ETH Transfer');
        const amount = title.replace(/^Transfer\s+/, '');
        if (existing) {
          existing.count++;
        } else {
          groups.push({ type: 'ETH Transfer', count: 1, details: amount });
        }
      } else if (title.startsWith('Transfer') || title.startsWith('Fund')) {
        const existing = groups.find(g => g.type === 'Token Transfer');
        const amount = title.replace(/^(Transfer|Fund)\s+/, '');
        const isPayer = tx.description?.includes('Payer');
        const source = isPayer ? 'via Payer' : 'via Treasury';
        if (existing) {
          existing.count++;
          existing.details = `${existing.count} transfers`;
        } else {
          groups.push({ type: 'Token Transfer', count: 1, details: `${amount} ${source}` });
        }
      } else if (title.startsWith('Stream')) {
        const existing = groups.find(g => g.type === 'Stream');
        if (existing) {
          existing.count++;
          existing.details = `${existing.count} streams`;
        } else {
          groups.push({ type: 'Stream', count: 1, details: title + (tx.description ? ` (${tx.description})` : '') });
        }
      } else if (title.includes('Noun')) {
        groups.push({ type: 'Noun Transfer', count: 1, details: title });
      } else if (title.startsWith('Approve')) {
        groups.push({ type: 'Approval', count: 1, details: title });
      } else if (title.startsWith('Delegate')) {
        groups.push({ type: 'Delegation', count: 1, details: title });
      } else {
        groups.push({ type: 'Contract Call', count: 1, details: title + (tx.description ? ` - ${tx.description}` : '') });
      }
    }
    
    return groups;
  }, [decodedTransactions]);
  
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
              {item.type === 'Noun Transfer' && '⌐◨-◨ '}
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
