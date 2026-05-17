/**
 * Spends Tab — treasury timelock activity.
 * Pending queue (with eta), recent executed, recent cancelled.
 */

'use client';

import { useTreasuryTransactions } from '@/app/lib/nouns/hooks';
import styles from '../Treasury.module.css';
import {
  formatEthFromWei,
  shortenAddress,
  formatRelativeTime,
  formatAbsoluteDate,
  etherscanTxUrl,
} from './utils';
import { Address } from './Address';

export function SpendsTab() {
  const { data, isLoading, error } = useTreasuryTransactions();

  if (isLoading) return <div className={styles.loading}>Loading treasury activity…</div>;
  if (error) return <div className={styles.empty}>Failed to load treasury activity.</div>;
  if (!data) return null;

  const { totals, last30d, pending, executed, cancelled } = data;

  return (
    <div>
      <div className={styles.metricRow}>
        <Metric label="Executed (all-time)" value={formatEthFromWei(totals.outflowsExecutedWei, 2)} sub={`${totals.executedCount} txs`} />
        <Metric label="Cancelled" value={formatEthFromWei(totals.outflowsCancelledWei, 2)} sub={`${totals.cancelledCount} txs`} />
        <Metric label="Last 30 days" value={formatEthFromWei(last30d.outflowsExecutedWei, 2)} sub={`${last30d.executedCount} txs`} />
        <Metric label="Queued now" value={String(totals.queuedCount)} sub="awaiting execution" />
      </div>

      {pending.length > 0 && (
        <>
          <h3 className={styles.subHeader}>Pending queue</h3>
          <div className={styles.tableScroll}>
            <table className={styles.activityTable}>
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Value</th>
                  <th>Signature</th>
                  <th>ETA</th>
                  <th>Queued</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <Address
                        address={tx.target}
                        fallbackEns={tx.targetEns}
                        className={styles.linkOut}
                      />
                    </td>
                    <td>{formatEthFromWei(tx.valueWei, 4)}</td>
                    <td className={styles.mono}>{tx.signature || '—'}</td>
                    <td>{formatRelativeTime(tx.eta)}</td>
                    <td className={styles.mono}>{formatAbsoluteDate(tx.blockTimestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3 className={styles.subHeader}>Recent executed</h3>
      <ExecutedOrCancelledTable rows={executed} kind="executed" />

      {cancelled.length > 0 && (
        <>
          <h3 className={styles.subHeader}>Recent cancelled</h3>
          <ExecutedOrCancelledTable rows={cancelled} kind="cancelled" />
        </>
      )}
    </div>
  );
}

function ExecutedOrCancelledTable({
  rows,
  kind,
}: {
  rows: import('@/app/api/nouns/treasury/transactions/route').TreasuryTxRow[];
  kind: 'executed' | 'cancelled';
}) {
  if (rows.length === 0) {
    return <div className={styles.empty}>No {kind} transactions.</div>;
  }
  const statusClass = kind === 'executed' ? styles.statusExecuted : styles.statusCancelled;
  return (
    <div className={styles.tableScroll}>
      <table className={styles.activityTable}>
        <thead>
          <tr>
            <th>When</th>
            <th>Target</th>
            <th>Value</th>
            <th>Signature</th>
            <th>Status</th>
            <th>Tx</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => (
            <tr key={tx.id}>
              <td title={formatAbsoluteDate(tx.blockTimestamp)}>{formatRelativeTime(tx.blockTimestamp)}</td>
              <td>
                <Address
                  address={tx.target}
                  fallbackEns={tx.targetEns}
                  className={styles.linkOut}
                />
              </td>
              <td>{formatEthFromWei(tx.valueWei, 4)}</td>
              <td className={styles.mono}>{tx.signature || '—'}</td>
              <td>
                <span className={`${styles.statusBadge} ${statusClass}`}>{tx.status}</span>
              </td>
              <td>
                <a className={`${styles.linkOut} ${styles.mono}`} href={etherscanTxUrl(tx.txHash)} target="_blank" rel="noreferrer">
                  {shortenAddress(tx.txHash)}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
      {sub && <div className={styles.metricSub}>{sub}</div>}
    </div>
  );
}
