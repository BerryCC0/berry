/**
 * Client Rewards Tab — per-client cumulative rewards, withdrawals, balances.
 *
 * Per-client name uses on-chain `name` (from clients table). If that's empty
 * it falls back to the local CLIENT_REGISTRY for known apps that haven't
 * registered a descriptor on-chain.
 */

'use client';

import { useMemo, useState } from 'react';
import { useTreasuryClientRewards } from '@/app/lib/nouns/hooks';
import { getClientName, getClientUrl } from '@/OS/lib/clientNames';
import styles from '../Treasury.module.css';
import {
  formatEthFromWei,
  formatRelativeTime,
  formatAbsoluteDate,
} from './utils';
import { Address } from './Address';

type SortKey = 'totalRewarded' | 'totalWithdrawn' | 'remaining' | 'id';

export function ClientRewardsTab() {
  const { data, isLoading, error } = useTreasuryClientRewards();
  const [sortKey, setSortKey] = useState<SortKey>('totalRewarded');

  const sortedClients = useMemo(() => {
    if (!data) return [];
    const arr = [...data.clients];
    arr.sort((a, b) => {
      if (sortKey === 'id') return a.clientId - b.clientId;
      const aVal = BigInt(
        sortKey === 'totalRewarded'
          ? a.totalRewardedWei
          : sortKey === 'totalWithdrawn'
            ? a.totalWithdrawnWei
            : a.remainingBalanceWei,
      );
      const bVal = BigInt(
        sortKey === 'totalRewarded'
          ? b.totalRewardedWei
          : sortKey === 'totalWithdrawn'
            ? b.totalWithdrawnWei
            : b.remainingBalanceWei,
      );
      return aVal === bVal ? 0 : aVal < bVal ? 1 : -1;
    });
    return arr;
  }, [data, sortKey]);

  if (isLoading) return <div className={styles.loading}>Loading client rewards…</div>;
  if (error) return <div className={styles.empty}>Failed to load client rewards.</div>;
  if (!data) return null;

  const { totals, last30d, recent } = data;

  return (
    <div>
      <div className={styles.metricRow}>
        <Metric label="Rewards (all-time)" value={formatEthFromWei(totals.totalRewardedWei, 2)} sub={`${totals.clientCount} clients · ${totals.approvedCount} approved`} />
        <Metric label="Withdrawn (all-time)" value={formatEthFromWei(totals.totalWithdrawnWei, 2)} />
        <Metric label="Outstanding balance" value={formatEthFromWei(totals.totalRemainingWei, 2)} sub="rewards minus withdrawals" />
        <Metric label="Last 30 days" value={formatEthFromWei(last30d.rewardedWei, 4)} sub={`${last30d.rewardEventCount} events · ${last30d.withdrawalCount} withdrawals`} />
      </div>

      <h3 className={styles.subHeader}>Clients</h3>
      <div className={styles.tableScroll}>
        <table className={styles.activityTable}>
          <thead>
            <tr>
              <SortableTh label="ID" active={sortKey === 'id'} onClick={() => setSortKey('id')} />
              <th>Name</th>
              <SortableTh label="Rewarded" active={sortKey === 'totalRewarded'} onClick={() => setSortKey('totalRewarded')} />
              <SortableTh label="Withdrawn" active={sortKey === 'totalWithdrawn'} onClick={() => setSortKey('totalWithdrawn')} />
              <SortableTh label="Remaining" active={sortKey === 'remaining'} onClick={() => setSortKey('remaining')} />
              <th>Approved</th>
            </tr>
          </thead>
          <tbody>
            {sortedClients.map((c) => {
              const fallbackName = getClientName(c.clientId);
              const url = getClientUrl(c.clientId, c.description);
              const displayName = c.name || fallbackName || `Client #${c.clientId}`;
              return (
                <tr key={c.clientId}>
                  <td className={styles.mono}>{c.clientId}</td>
                  <td>
                    {url ? (
                      <a className={styles.linkOut} href={url} target="_blank" rel="noreferrer">
                        {displayName}
                      </a>
                    ) : (
                      displayName
                    )}
                  </td>
                  <td>{formatEthFromWei(c.totalRewardedWei, 4)}</td>
                  <td>{formatEthFromWei(c.totalWithdrawnWei, 4)}</td>
                  <td>{formatEthFromWei(c.remainingBalanceWei, 4)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${c.approved ? styles.statusExecuted : styles.statusPending}`}>
                      {c.approved ? 'yes' : 'no'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className={styles.subHeader}>Recent activity</h3>
      {recent.length === 0 ? (
        <div className={styles.empty}>No recent rewards or withdrawals.</div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.activityTable}>
            <thead>
              <tr>
                <th>When</th>
                <th>Kind</th>
                <th>Client</th>
                <th>Amount</th>
                <th>To</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => {
                const clientLabel = getClientName(r.clientId) || `Client #${r.clientId}`;
                return (
                  <tr key={`${r.kind}-${r.id}`}>
                    <td title={formatAbsoluteDate(r.blockTimestamp)}>{formatRelativeTime(r.blockTimestamp)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${r.kind === 'rewarded' ? styles.statusExecuted : styles.statusActive}`}>
                        {r.kind}
                      </span>
                    </td>
                    <td>{clientLabel}</td>
                    <td>{formatEthFromWei(r.amountWei, 6)}</td>
                    <td>
                      {r.to ? (
                        <Address
                          address={r.to}
                          fallbackEns={r.toEns}
                          className={styles.linkOut}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SortableTh({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th onClick={onClick} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label} {active ? '▾' : ''}
    </th>
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
