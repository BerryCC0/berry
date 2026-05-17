/**
 * Streams Tab — payment streams created via the StreamFactory.
 */

'use client';

import { useMemo, useState } from 'react';
import { useTreasuryStreams } from '@/app/lib/nouns/hooks';
import styles from '../Treasury.module.css';
import {
  tokenSymbolForAddress,
  formatTokenAmount,
  formatAbsoluteDate,
} from './utils';
import { Address } from './Address';

type StatusFilter = 'all' | 'active' | 'complete' | 'pending';

export function StreamsTab() {
  const { data, isLoading, error } = useTreasuryStreams();
  const [filter, setFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.streams;
    return data.streams.filter((s) => s.status === filter);
  }, [data, filter]);

  if (isLoading) return <div className={styles.loading}>Loading streams…</div>;
  if (error) return <div className={styles.empty}>Failed to load streams.</div>;
  if (!data) return null;

  const { totals } = data;

  return (
    <div>
      <div className={styles.metricRow}>
        <Metric label="Total streams" value={String(totals.streamCount)} />
        <Metric label="Active" value={String(totals.activeCount)} />
        <Metric label="Complete" value={String(totals.completeCount)} />
        <Metric label="Pending start" value={String(totals.pendingCount)} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['all', 'active', 'pending', 'complete'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            className={`${styles.tab} ${filter === f ? styles.active : ''}`}
            style={{ borderRadius: 4, borderBottom: '1px solid var(--berry-border)' }}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>No streams match the filter.</div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.activityTable}>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Vested</th>
                <th>Claimed</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Stream</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Address
                      address={s.recipient}
                      fallbackEns={s.recipientEns}
                      className={styles.linkOut}
                    />
                  </td>
                  <td>
                    {formatTokenAmount(s.tokenAddress, s.tokenAmountRaw)}{' '}
                    <span className={styles.mono}>{tokenSymbolForAddress(s.tokenAddress)}</span>
                  </td>
                  <td style={{ minWidth: 90 }}>
                    <div>{Math.round(s.vestedRatio * 100)}%</div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${Math.round(s.vestedRatio * 100)}%` }} />
                    </div>
                  </td>
                  <td style={{ minWidth: 110 }}>
                    {s.claimedRatio === null || s.claimedRaw === null ? (
                      <div className={styles.mono}>—</div>
                    ) : (
                      <>
                        <div>
                          {Math.round(s.claimedRatio * 100)}%{' '}
                          <span className={styles.mono} style={{ opacity: 0.7 }}>
                            ({formatTokenAmount(s.tokenAddress, s.claimedRaw)})
                          </span>
                        </div>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${Math.round(s.claimedRatio * 100)}%` }}
                          />
                        </div>
                      </>
                    )}
                  </td>
                  <td className={styles.mono}>{formatAbsoluteDate(s.startTime)}</td>
                  <td className={styles.mono}>{formatAbsoluteDate(s.stopTime)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${statusClassFor(s.status)}`}>{s.status}</span>
                  </td>
                  <td>
                    <Address
                      address={s.streamAddress}
                      className={`${styles.linkOut} ${styles.mono}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function statusClassFor(status: 'pending' | 'active' | 'complete'): string {
  if (status === 'active') return styles.statusActive;
  if (status === 'pending') return styles.statusPending;
  return styles.statusComplete;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
    </div>
  );
}
