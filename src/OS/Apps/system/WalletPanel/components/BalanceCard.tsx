"use client";

/**
 * BalanceCard Component
 * Displays wallet balance with token icon
 */

import styles from "./BalanceCard.module.css";

interface BalanceCardProps {
  balance?: string;
  symbol?: string;
  isLoading?: boolean;
}

export function BalanceCard({ balance, symbol = "ETH", isLoading }: BalanceCardProps) {
  const formatBalance = (bal?: string): string => {
    if (!bal) return "0.00";
    
    const num = parseFloat(bal);
    
    if (num < 0.0001 && num > 0) return "< 0.0001";
    if (num === 0) return "0.00";
    
    if (num >= 1000) {
      return num.toLocaleString("en-US", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
    
    return num.toLocaleString("en-US", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 4 
    });
  };

  return (
    <div className={styles.balanceCard}>
      <div className={styles.label}>Balance</div>
      
      {isLoading ? (
        <div className={styles.balanceDisplay}>
          <div className={styles.loadingSkeleton}>
            <div className={styles.skeletonIcon} />
            <div className={styles.skeletonValue} />
          </div>
        </div>
      ) : (
        <div className={styles.balanceDisplay}>
          <div className={styles.amount}>
            <span className={styles.symbol}>{getTokenEmoji(symbol)}</span>
            <span className={styles.value}>{formatBalance(balance)}</span>
            <span className={styles.unit}>{symbol}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getTokenEmoji(symbol?: string): string {
  switch (symbol?.toUpperCase()) {
    case "ETH":
    case "WETH":
      return "⟠";
    case "BTC":
    case "WBTC":
      return "₿";
    case "SOL":
      return "◎";
    case "USDC":
    case "USDT":
      return "$";
    default:
      return "◈";
  }
}

