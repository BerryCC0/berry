"use client";

/**
 * TokenList Component
 * Displays all token balances for the connected wallet
 */

import { formatTokenBalance, type TokenBalance } from "@/OS/hooks/useTokenBalances";
import styles from "./TokenList.module.css";

interface TokenListProps {
  native: TokenBalance | null;
  tokens: TokenBalance[];
  isLoading: boolean;
  error: string | null;
}

export function TokenList({ native, tokens, isLoading, error }: TokenListProps) {
  if (isLoading) {
    return (
      <div className={styles.tokenList}>
        <div className={styles.label}>Assets</div>
        <div className={styles.loading}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={styles.skeletonIcon} />
              <div className={styles.skeletonText} />
              <div className={styles.skeletonBalance} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.tokenList}>
        <div className={styles.label}>Assets</div>
        <div className={styles.error}>
          <span>⚠️</span>
          <span>Failed to load tokens</span>
        </div>
      </div>
    );
  }

  const allTokens = native ? [native, ...tokens] : tokens;

  if (allTokens.length === 0) {
    return (
      <div className={styles.tokenList}>
        <div className={styles.label}>Assets</div>
        <div className={styles.empty}>No tokens found</div>
      </div>
    );
  }

  return (
    <div className={styles.tokenList}>
      <div className={styles.label}>Assets ({allTokens.length})</div>
      <div className={styles.list}>
        {allTokens.map((token, index) => (
          <div
            key={token.contractAddress || `native-${index}`}
            className={styles.tokenRow}
          >
            <div className={styles.tokenIcon}>
              {token.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={token.logo} alt={token.symbol} className={styles.tokenLogo} />
              ) : (
                <span className={styles.tokenEmoji}>{getTokenEmoji(token.symbol)}</span>
              )}
            </div>
            <div className={styles.tokenInfo}>
              <span className={styles.tokenSymbol}>{token.symbol}</span>
              <span className={styles.tokenName}>{token.name}</span>
            </div>
            <div className={styles.tokenBalance}>
              {formatTokenBalance(token.balance, token.decimals)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTokenEmoji(symbol: string): string {
  const upper = symbol?.toUpperCase();
  switch (upper) {
    case "ETH":
    case "WETH":
      return "⟠";
    case "BTC":
    case "WBTC":
      return "₿";
    case "USDC":
    case "USDT":
    case "DAI":
      return "$";
    case "MATIC":
      return "⬡";
    case "BNB":
      return "◈";
    case "AVAX":
      return "🔺";
    default:
      return "◇";
  }
}

