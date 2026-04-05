/**
 * Client Incentives Info Card
 * Displays contract summary stats and parameters.
 */

import type { Totals, RewardEconDataPoint } from '../types';
import { formatEth } from '../utils';
import styles from '../Clients.module.css';

interface InfoCardProps {
  totals: Totals;
  contractWethBalanceEth: number | null;
  quorumBps: number | null;
  rewardEconData: RewardEconDataPoint[];
}

export function InfoCard({ totals, contractWethBalanceEth, quorumBps, rewardEconData }: InfoCardProps) {
  return (
    <div className={styles.infoCard}>
      <div className={styles.infoTitle}>Client Incentives Contract</div>
      <div className={styles.infoDescription}>
        Nouns DAO rewards third-party clients that facilitate governance participation and auction bidding.
      </div>
      <div className={styles.infoStats}>
        <div className={styles.infoStatRow}>
          <span className={styles.infoStatLabel}>Registered Clients</span>
          <span className={styles.infoStatValue}>{totals.count}</span>
        </div>
        <div className={styles.infoStatRow}>
          <span className={styles.infoStatLabel}>Current Balance</span>
          <span className={styles.infoStatValue}>
            {contractWethBalanceEth != null
              ? `${formatEth(contractWethBalanceEth)} ETH`
              : '—'}
          </span>
        </div>
        <div className={styles.infoStatRow}>
          <span className={styles.infoStatLabel}>Total Rewarded</span>
          <span className={styles.infoStatValue}>{formatEth(totals.rewarded)} ETH</span>
        </div>
        <div className={styles.infoStatRow}>
          <span className={styles.infoStatLabel}>Total Withdrawn</span>
          <span className={styles.infoStatValue}>{formatEth(totals.withdrawn)} ETH</span>
        </div>
        <div className={styles.infoStatRow}>
          <span className={styles.infoStatLabel}>Pending Withdraw or Approval</span>
          <span className={styles.infoStatValue}>{formatEth(totals.balance)} ETH</span>
        </div>
        <div className={styles.infoDivider} />
        <div className={styles.infoStatRow}>
          <span className={styles.infoStatLabel}>Auction Bid Reward</span>
          <span className={styles.infoStatValue}>5% of winning bid</span>
        </div>
        <div className={styles.infoStatRow}>
          <span className={styles.infoStatLabel}>Proposal Eligibility Quorum</span>
          <span className={styles.infoStatValue}>
            {quorumBps != null ? `${quorumBps / 100}%` : '10%'}
          </span>
        </div>
        <div className={styles.infoStatRow}>
          <span className={styles.infoStatLabel}>Previous Reward per Proposal</span>
          <span className={styles.infoStatValue}>
            {rewardEconData.length > 0
              ? `${formatEth(rewardEconData[rewardEconData.length - 1].rewardPerProposal)} ETH`
              : '—'}
          </span>
        </div>
        <div className={styles.infoStatRow}>
          <span className={styles.infoStatLabel}>Previous Reward per Vote</span>
          <span className={styles.infoStatValue}>
            {rewardEconData.length > 0
              ? `${formatEth(rewardEconData[rewardEconData.length - 1].rewardPerVote)} ETH`
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
