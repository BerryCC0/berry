/**
 * Recharts Custom Tooltip Components
 */

import { formatEth } from '../utils';
import styles from '../Clients.module.css';

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

export function EthTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tooltipValue}>
          {p.name}: {formatEth(p.value ?? 0)} ETH
        </div>
      ))}
    </div>
  );
}

export function RevenueTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tooltipValue}>
          {p.name}: {formatEth(p.value ?? 0)} ETH
        </div>
      ))}
    </div>
  );
}
