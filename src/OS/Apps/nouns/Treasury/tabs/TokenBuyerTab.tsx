/**
 * Token Buyer Tab — ETH-out / USDC-in trades through the TokenBuyer contract.
 */

'use client';

import { useTokenBuyerTrades } from '@/app/lib/nouns/hooks';
import styles from '../Treasury.module.css';
import {
  formatEthFromWei,
  formatUsdcFromRaw,
  shortenAddress,
  formatRelativeTime,
  formatAbsoluteDate,
  etherscanTxUrl,
} from './utils';
import { Address } from './Address';
import { formatEther, formatUnits } from 'viem';

function effectiveRate(ethOutWei: string, tokenInRaw: string): string {
  try {
    const eth = parseFloat(formatEther(BigInt(ethOutWei)));
    const usdc = parseFloat(formatUnits(BigInt(tokenInRaw), 6));
    if (eth === 0) return '—';
    return `$${(usdc / eth).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} / ETH`;
  } catch {
    return '—';
  }
}

export function TokenBuyerTab() {
  const { data, isLoading, error } = useTokenBuyerTrades();

  if (isLoading) return <div className={styles.loading}>Loading Token Buyer trades…</div>;
  if (error) return <div className={styles.empty}>Failed to load Token Buyer trades.</div>;
  if (!data) return null;

  const { totals, last30d, trades } = data;

  return (
    <div>
      <div className={styles.metricRow}>
        <Metric label="ETH sold (all-time)" value={formatEthFromWei(totals.totalEthOutWei, 2)} sub={`${totals.tradeCount} trades`} />
        <Metric label="USDC bought (all-time)" value={formatUsdcFromRaw(totals.totalTokenInRaw, 0)} />
        <Metric label="ETH sold (30d)" value={formatEthFromWei(last30d.totalEthOutWei, 2)} sub={`${last30d.tradeCount} trades`} />
        <Metric label="USDC bought (30d)" value={formatUsdcFromRaw(last30d.totalTokenInRaw, 0)} />
      </div>

      <h3 className={styles.subHeader}>Recent trades</h3>
      {trades.length === 0 ? (
        <div className={styles.empty}>No trades yet.</div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.activityTable}>
            <thead>
              <tr>
                <th>When</th>
                <th>To</th>
                <th>ETH out</th>
                <th>USDC in</th>
                <th>Effective rate</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id}>
                  <td title={formatAbsoluteDate(t.blockTimestamp)}>{formatRelativeTime(t.blockTimestamp)}</td>
                  <td>
                    <Address
                      address={t.to}
                      fallbackEns={t.toEns}
                      className={styles.linkOut}
                    />
                  </td>
                  <td>{formatEthFromWei(t.ethOutWei, 4)}</td>
                  <td>{formatUsdcFromRaw(t.tokenInRaw, 2)}</td>
                  <td className={styles.mono}>{effectiveRate(t.ethOutWei, t.tokenInRaw)}</td>
                  <td>
                    <a className={`${styles.linkOut} ${styles.mono}`} href={etherscanTxUrl(t.txHash)} target="_blank" rel="noreferrer">
                      {shortenAddress(t.txHash)}
                    </a>
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

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
      {sub && <div className={styles.metricSub}>{sub}</div>}
    </div>
  );
}
