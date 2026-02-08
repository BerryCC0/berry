/**
 * Reward Rate Line Charts (per auction, per proposal, per vote)
 */

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { RewardEconDataPoint } from '../types';
import { EthTooltip } from './ChartTooltips';
import styles from '../Clients.module.css';

interface RewardRateChartsProps {
  rewardEconData: RewardEconDataPoint[];
}

export function RewardRateCharts({ rewardEconData }: RewardRateChartsProps) {
  if (rewardEconData.length === 0) return null;

  return (
    <div className={styles.chartsRowTriple}>
      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>Reward per Winning Auction</div>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rewardEconData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} width={50} />
              <Tooltip content={<EthTooltip />} />
              <Line type="monotone" dataKey="rewardPerAuction" name="Per Auction"
                stroke="var(--berry-warning, #ff9500)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>Reward per Proposal</div>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rewardEconData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} width={50} />
              <Tooltip content={<EthTooltip />} />
              <Line type="monotone" dataKey="rewardPerProposal" name="Per Proposal"
                stroke="var(--berry-accent, #5B8DEF)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>Reward per Vote</div>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rewardEconData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} width={50} />
              <Tooltip content={<EthTooltip />} />
              <Line type="monotone" dataKey="rewardPerVote" name="Per Vote"
                stroke="var(--berry-success, #34c759)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
