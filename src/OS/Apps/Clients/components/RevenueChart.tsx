/**
 * Auction Revenue per Update Bar Chart
 */

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { RevenueDataPoint } from '../types';
import { RevenueTooltip } from './ChartTooltips';
import styles from '../Clients.module.css';

interface RevenueChartProps {
  revenueData: RevenueDataPoint[];
}

export function RevenueChart({ revenueData }: RevenueChartProps) {
  if (revenueData.length === 0) return null;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartTitle}>Auction Revenue per Update</div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--berry-border, #e5e5e5)" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} width={50} />
            <Tooltip content={<RevenueTooltip />} />
            <Bar dataKey="revenue" name="Auction Revenue" fill="var(--berry-warning, #ff9500)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
