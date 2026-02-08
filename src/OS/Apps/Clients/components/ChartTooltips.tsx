/**
 * Recharts Custom Tooltip Components
 */

import { formatEth } from '../utils';
import styles from '../Clients.module.css';

export function EthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className={styles.tooltipValue}>
          {p.name}: {formatEth(p.value)} ETH
        </div>
      ))}
    </div>
  );
}

export function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className={styles.tooltipValue}>
          {p.name}: {formatEth(p.value)} ETH
        </div>
      ))}
    </div>
  );
}
