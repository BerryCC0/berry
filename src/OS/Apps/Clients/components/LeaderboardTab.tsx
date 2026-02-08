/**
 * Leaderboard Tab
 * Sortable table of all clients ranked by various metrics.
 */

'use client';

import type { ClientData, ClientMetadataMap } from '../types';
import { weiToEth, formatEth } from '../utils';
import { ClientAvatar } from './ClientAvatar';
import styles from '../Clients.module.css';

interface LeaderboardTabProps {
  sortedClients: ClientData[];
  clientMetadata?: ClientMetadataMap;
  clients?: ClientData[];
  sortField: string;
  sortDir: 'asc' | 'desc';
  handleSort: (field: string) => void;
  onSelectClient: (clientId: number) => void;
}

export function LeaderboardTab({
  sortedClients, clientMetadata, clients,
  sortField, sortDir, handleSort, onSelectClient,
}: LeaderboardTabProps) {
  const sortArrow = (field: string) =>
    sortField === field ? (sortDir === 'desc' ? ' \u25BE' : ' \u25B4') : '';

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Client</th>
            <th className={`${styles.thRight} ${sortField === 'totalRewarded' ? styles.thActive : ''}`}
              onClick={() => handleSort('totalRewarded')}>
              Rewarded{sortArrow('totalRewarded')}
            </th>
            <th className={`${styles.thRight} ${sortField === 'balance' ? styles.thActive : ''}`}
              onClick={() => handleSort('balance')}>
              Balance{sortArrow('balance')}
            </th>
            <th className={`${styles.thRight} ${sortField === 'voteCount' ? styles.thActive : ''}`}
              onClick={() => handleSort('voteCount')}>
              Votes{sortArrow('voteCount')}
            </th>
            <th className={`${styles.thRight} ${sortField === 'proposalCount' ? styles.thActive : ''}`}
              onClick={() => handleSort('proposalCount')}>
              Props{sortArrow('proposalCount')}
            </th>
            <th className={`${styles.thRight} ${sortField === 'bidCount' ? styles.thActive : ''}`}
              onClick={() => handleSort('bidCount')}>
              Bids{sortArrow('bidCount')}
            </th>
            <th className={`${styles.thRight} ${sortField === 'auctionCount' ? styles.thActive : ''}`}
              onClick={() => handleSort('auctionCount')}>
              Auctions{sortArrow('auctionCount')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedClients.map((client, idx) => {
            const balance = weiToEth(client.totalRewarded) - weiToEth(client.totalWithdrawn);
            const rankClass = idx === 0 ? styles.rankGold
              : idx === 1 ? styles.rankSilver
              : idx === 2 ? styles.rankBronze : '';
            return (
              <tr key={client.clientId} onClick={() => onSelectClient(client.clientId)}>
                <td><span className={`${styles.rank} ${rankClass}`}>{idx + 1}</span></td>
                <td>
                  <div className={styles.clientNameCell}>
                    <ClientAvatar
                      clientId={client.clientId}
                      name={client.name}
                      clientMetadata={clientMetadata}
                      clients={clients}
                    />
                    <div>
                      <span className={styles.clientName}>
                        {client.name || `Client ${client.clientId}`}
                        {client.approved && <span className={styles.approvedBadge} />}
                      </span>
                      <div className={styles.clientId}>ID: {client.clientId}</div>
                    </div>
                  </div>
                </td>
                <td className={`${styles.tdRight} ${styles.tdMono}`}>{formatEth(weiToEth(client.totalRewarded))}</td>
                <td className={`${styles.tdRight} ${styles.tdMono}`}>{formatEth(balance)}</td>
                <td className={styles.tdRight}>{client.voteCount.toLocaleString()}</td>
                <td className={styles.tdRight}>{client.proposalCount}</td>
                <td className={styles.tdRight}>{client.bidCount.toLocaleString()}</td>
                <td className={styles.tdRight}>{client.auctionCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
