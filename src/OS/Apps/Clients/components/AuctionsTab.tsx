/**
 * Auctions Tab
 * Current cycle auction data with distribution charts, summary, and auction list.
 */

'use client';

import { memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList,
} from 'recharts';
import type { ClientData, ClientMetadataMap, CycleAuctionsResponse } from '../types';
import { useUpdateAuctionRewards } from '../hooks/useUpdateRewards';
import { getClientName } from '@/OS/lib/clientNames';
import { CHART_COLORS } from '../constants';
import { weiToEth, formatEth } from '../utils';
import { EthTooltip } from './ChartTooltips';
import { ClientTick } from './ClientTick';
import { ClientAvatar } from './ClientAvatar';
import styles from '../Clients.module.css';

const NO_CLIENT_COLOR = '#999';
/** Get chart color — gray for no-client sentinel (-1), indexed color otherwise */
function clientColor(clientId: number): string {
  return clientId === -1 ? NO_CLIENT_COLOR : CHART_COLORS[clientId % CHART_COLORS.length];
}
/** Get display name — 'No Client' for sentinel, registry lookup otherwise */
function clientName(clientId: number, fallback?: string): string {
  if (clientId === -1) return 'No Client';
  return getClientName(clientId) || fallback || `Client ${clientId}`;
}

interface AuctionsTabProps {
  cycleAuctionsData?: CycleAuctionsResponse;
  clientMetadata?: ClientMetadataMap;
  clients?: ClientData[];
  pendingRevenueEth: number | null;
}

export const AuctionsTab = memo(function AuctionsTab({ cycleAuctionsData, clientMetadata, clients, pendingRevenueEth }: AuctionsTabProps) {
  const {
    execute: executeAuctionUpdate,
    isPending: isAuctionPending,
    isConfirming: isAuctionConfirming,
    isSuccess: isAuctionSuccess,
    canExecute: canExecuteAuction,
    isSimulating: isAuctionSimulating,
    revertReason: auctionRevertReason,
    lastNounId,
  } = useUpdateAuctionRewards();
  return (
    <>
      {/* Auction distribution charts */}
      {cycleAuctionsData && (cycleAuctionsData.winsByClient.length > 0 || cycleAuctionsData.bidsByClient.length > 0) && (
        <div className={styles.chartsRowTriple}>
          {cycleAuctionsData.bidsByClient.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Bids by Client</div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cycleAuctionsData.bidsByClient.map((b) => ({
                      ...b,
                      name: clientName(b.clientId, b.name),
                      color: clientColor(b.clientId),
                    }))}
                    margin={{ top: 16, right: 8, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
                    <XAxis dataKey="name" tick={<ClientTick clientMetadata={clientMetadata} chartData={cycleAuctionsData.bidsByClient.map((b) => ({ ...b, name: clientName(b.clientId, b.name) }))} clients={clients} />} interval={0} height={60} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip />
                    <Bar dataKey="bidCount" name="Bids" radius={[3, 3, 0, 0]}>
                      {cycleAuctionsData.bidsByClient.map((entry, i) => (
                        <Cell key={i} fill={clientColor(entry.clientId)} />
                      ))}
                      <LabelList dataKey="bidCount" position="top" fontSize={9} formatter={(v: any) => Number(v).toLocaleString()} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {cycleAuctionsData.winsByClient.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Winning Bids by Client</div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cycleAuctionsData.winsByClient.map((w) => ({
                      ...w,
                      name: clientName(w.clientId, w.name),
                      color: clientColor(w.clientId),
                    }))}
                    margin={{ top: 16, right: 8, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
                    <XAxis dataKey="name" tick={<ClientTick clientMetadata={clientMetadata} chartData={cycleAuctionsData.winsByClient.map((w) => ({ ...w, name: clientName(w.clientId, w.name) }))} clients={clients} />} interval={0} height={60} />
                    <YAxis tick={{ fontSize: 10 }} width={30} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="winCount" name="Wins" radius={[3, 3, 0, 0]}>
                      {cycleAuctionsData.winsByClient.map((entry, i) => (
                        <Cell key={i} fill={clientColor(entry.clientId)} />
                      ))}
                      <LabelList dataKey="winCount" position="top" fontSize={9} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}


          {cycleAuctionsData.winsByClient.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>DAO Revenue by Client (ETH)</div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cycleAuctionsData.winsByClient.map((w) => ({
                      ...w,
                      name: clientName(w.clientId, w.name),
                      volume: weiToEth(w.winVolume || '0'),
                      color: clientColor(w.clientId),
                    }))}
                    margin={{ top: 16, right: 8, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
                    <XAxis dataKey="name" tick={<ClientTick clientMetadata={clientMetadata} chartData={cycleAuctionsData.winsByClient.map((w) => ({ ...w, name: clientName(w.clientId, w.name) }))} clients={clients} />} interval={0} height={60} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip content={<EthTooltip />} />
                    <Bar dataKey="volume" name="Volume" radius={[3, 3, 0, 0]}>
                      {cycleAuctionsData.winsByClient.map((entry, i) => (
                        <Cell key={i} fill={clientColor(entry.clientId)} />
                      ))}
                      <LabelList dataKey="volume" position="top" fontSize={9} formatter={(v: any) => formatEth(Number(v))} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auction summary */}
      <div className={styles.poolInfo}>
        <span>
          Auctions <span className={styles.poolValue}>
            {cycleAuctionsData ? cycleAuctionsData.auctions.length : '—'}
          </span>
        </span>
        <span>
          Revenue <span className={styles.poolValue}>
            {pendingRevenueEth != null
              ? `${formatEth(pendingRevenueEth)} ETH`
              : '—'}
          </span>
        </span>
        <span>
          Reward Pool (5%) <span className={styles.poolValue}>
            {pendingRevenueEth != null
              ? `${formatEth(pendingRevenueEth * 0.05)} ETH`
              : '—'}
          </span>
        </span>
        <button
          className={`${styles.updateButton} ${isAuctionPending || isAuctionConfirming ? styles.updateButtonPending : ''}`}
          disabled={!canExecuteAuction || isAuctionPending || isAuctionConfirming || isAuctionSuccess}
          onClick={executeAuctionUpdate}
          title={
            isAuctionSuccess ? 'Auction rewards updated!'
              : isAuctionConfirming ? 'Confirming transaction…'
              : isAuctionPending ? 'Waiting for wallet…'
              : !canExecuteAuction ? (auctionRevertReason || 'Not enough auctions since last update')
              : lastNounId != null ? `Update through Noun #${lastNounId}`
              : 'Update Auction Rewards'
          }
        >
          {isAuctionSuccess ? '✓ Updated'
            : isAuctionConfirming ? 'Confirming…'
            : isAuctionPending ? 'Pending…'
            : 'Update Auction Rewards'}
        </button>
      </div>

      {/* Auction list */}
      {cycleAuctionsData?.auctions && cycleAuctionsData.auctions.length > 0 ? (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 70 }}>Noun</th>
                <th>Winning Bid Client</th>
                <th className={styles.thRight}>Amount</th>
                <th className={styles.thRight}>Reward (5%)</th>
              </tr>
            </thead>
            <tbody>
              {cycleAuctionsData.auctions.map((auction) => {
                const amount = weiToEth(auction.amount);
                const reward = amount * 0.05;
                return (
                  <tr key={auction.nounId}>
                    <td>
                      <span className={styles.proposalNumber}>#{auction.nounId}</span>
                    </td>
                    <td>
                      {auction.winningBidClientId != null ? (
                        <div className={styles.clientNameCell}>
                          <ClientAvatar
                            clientId={auction.winningBidClientId}
                            name={auction.clientName || `Client ${auction.winningBidClientId}`}
                            clientMetadata={clientMetadata}
                            clients={clients}
                            size={20}
                          />
                          <span>{auction.clientName || `Client ${auction.winningBidClientId}`}</span>
                        </div>
                      ) : (
                        <span className={styles.noClient}>No client</span>
                      )}
                    </td>
                    <td className={`${styles.tdRight} ${styles.tdMono}`}>{formatEth(amount)} ETH</td>
                    <td className={`${styles.tdRight} ${styles.tdMono}`}>{formatEth(reward)} ETH</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}>
          No auctions in current reward period
        </div>
      )}
    </>
  );
});
