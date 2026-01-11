/**
 * Treasury Dashboard App
 * Displays Nouns DAO treasury balances, tokens, and owned Nouns
 */

'use client';

import { useState, useMemo } from 'react';
import { formatEther } from 'viem';
import { 
  useTreasuryBalances, 
  useTreasuryV1Balances,
  useTreasuryNouns,
  useTreasuryV1Nouns,
  useEthPrice,
} from '@/app/lib/nouns/hooks';
import { NounImage } from '@/app/lib/nouns/components';
import { getTraitName, type TraitType } from '@/app/lib/nouns/utils/trait-name-utils';
import { useTranslation } from '@/OS/lib/i18n';
import type { AppComponentProps } from '@/OS/types/app';
import { TraitDropdown } from './components';
import styles from './Treasury.module.css';

// Type for noun with seed
interface TreasuryNoun {
  id: string;
  seed: {
    background: number;
    body: number;
    accessory: number;
    head: number;
    glasses: number;
  };
}

// Filter state type
interface TraitFilters {
  background: number | null;
  body: number | null;
  accessory: number | null;
  head: number | null;
  glasses: number | null;
}

// Format large numbers with commas
function formatNumber(value: string, decimals = 2): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Format ETH with symbol
function formatEth(value: string): string {
  return `${formatNumber(value, 2)} Ξ`;
}

export function Treasury({ windowId }: AppComponentProps) {
  const { t } = useTranslation();
  const balances = useTreasuryBalances();
  const v1Balances = useTreasuryV1Balances();
  const { data: nounsData, isLoading: nounsLoading } = useTreasuryNouns();
  const { data: v1NounsData, isLoading: v1NounsLoading } = useTreasuryV1Nouns();
  const { price: ethPrice, isLoading: priceLoading } = useEthPrice();

  // Filter state
  const [filters, setFilters] = useState<TraitFilters>({
    background: null,
    body: null,
    accessory: null,
    head: null,
    glasses: null,
  });

  const isLoading = balances.isLoading || v1Balances.isLoading;
  const treasuryNouns = (nounsData?.nouns ?? []) as TreasuryNoun[];
  const v1TreasuryNouns = (v1NounsData?.nouns ?? []) as TreasuryNoun[];
  
  // Combine and sort numerically by ID (GraphQL sorts as strings)
  const allTreasuryNouns = useMemo(() => 
    [...treasuryNouns, ...v1TreasuryNouns]
      .sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10)),
    [treasuryNouns, v1TreasuryNouns]
  );

  // Get unique trait values from all nouns
  const uniqueTraits = useMemo(() => {
    const traits: Record<TraitType, Set<number>> = {
      background: new Set(),
      body: new Set(),
      accessory: new Set(),
      head: new Set(),
      glasses: new Set(),
    };

    allTreasuryNouns.forEach(noun => {
      traits.background.add(noun.seed.background);
      traits.body.add(noun.seed.body);
      traits.accessory.add(noun.seed.accessory);
      traits.head.add(noun.seed.head);
      traits.glasses.add(noun.seed.glasses);
    });

    // Convert sets to sorted arrays with names
    const traitOptions: Record<TraitType, { value: number; name: string }[]> = {
      background: [],
      body: [],
      accessory: [],
      head: [],
      glasses: [],
    };

    (Object.keys(traits) as TraitType[]).forEach(type => {
      traitOptions[type] = Array.from(traits[type])
        .map(value => ({ value, name: getTraitName(type, value) }))
        .sort((a, b) => a.name.localeCompare(b.name));
    });

    return traitOptions;
  }, [allTreasuryNouns]);

  // Filter nouns based on selected traits
  const filteredNouns = useMemo(() => {
    return allTreasuryNouns.filter(noun => {
      if (filters.background !== null && noun.seed.background !== filters.background) return false;
      if (filters.body !== null && noun.seed.body !== filters.body) return false;
      if (filters.accessory !== null && noun.seed.accessory !== filters.accessory) return false;
      if (filters.head !== null && noun.seed.head !== filters.head) return false;
      if (filters.glasses !== null && noun.seed.glasses !== filters.glasses) return false;
      return true;
    });
  }, [allTreasuryNouns, filters]);

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(v => v !== null);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      background: null,
      body: null,
      accessory: null,
      head: null,
      glasses: null,
    });
  };

  // Update a specific filter
  const updateFilter = (type: TraitType, value: number | null) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  // Calculate combined ETH balance
  const combinedEthRaw = balances.eth.raw + v1Balances.eth.raw;
  const combinedEthFormatted = formatEther(combinedEthRaw);

  // Calculate total ETH equivalent (ETH + staking derivatives)
  const totalEthEquivalentRaw = balances.ethEquivalent.raw + v1Balances.eth.raw;
  const totalEthEquivalentFormatted = formatEther(totalEthEquivalentRaw);

  // Calculate immediately spendable USD value (ETH + WETH + USDC)
  const spendableEth = parseFloat(formatEther(
    combinedEthRaw + (balances.tokens.WETH?.raw ?? BigInt(0))
  ));
  const spendableUsdc = parseFloat(balances.tokens.USDC?.formatted ?? '0');
  const spendableUsd = (spendableEth * ethPrice) + spendableUsdc;

  // Calculate staked tokens USD value (wstETH + stETH + rETH + mETH)
  const stakedEth = parseFloat(formatEther(
    (balances.tokens.wstETH?.raw ?? BigInt(0)) +
    (balances.tokens.stETH?.raw ?? BigInt(0)) +
    (balances.tokens.rETH?.raw ?? BigInt(0)) +
    (balances.tokens.mETH?.raw ?? BigInt(0))
  ));
  const stakedUsd = stakedEth * ethPrice;

  return (
    <div className={styles.treasury}>

      {/* Contract Addresses */}
      <div className={styles.section}>
        <div className={styles.addressList}>
          <div className={styles.addressItem}>
            <span className={styles.addressLabel}>Treasury V2</span>
            <code className={styles.address}>0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71</code>
          </div>
          <div className={styles.addressItem}>
            <span className={styles.addressLabel}>Treasury V1</span>
            <code className={styles.address}>0x0BC3807Ec262cB779b38D65b38158acC3bfedE10</code>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total ETH Equivalent</div>
          <div className={styles.statValue}>
            {isLoading ? '...' : formatEth(totalEthEquivalentFormatted)}
          </div>
          <div className={styles.statSubtext}>ETH + staking derivatives</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>ETH Balance</div>
          <div className={styles.statValue}>
            {isLoading ? '...' : formatEth(combinedEthFormatted)}
          </div>
          <div className={styles.statSubtext}>V1 + V2 treasuries</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>USDC</div>
          <div className={styles.statValue}>
            {isLoading ? '...' : `$${formatNumber(balances.tokens.USDC?.formatted ?? '0', 0)}`}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Nouns Held</div>
          <div className={styles.statValue}>
            {nounsLoading || v1NounsLoading ? '...' : allTreasuryNouns.length}
          </div>
        </div>

      </div>

      {/* USD Value Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{t('treasury.immediatelySpendable')}</div>
          <div className={styles.summaryValue}>
            {isLoading || priceLoading ? '...' : `$${formatNumber(spendableUsd.toString(), 0)}`}
          </div>
          <div className={styles.summaryBreakdown}>
            ETH + WETH + USDC
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{t('treasury.stakedAssets')}</div>
          <div className={styles.summaryValue}>
            {isLoading || priceLoading ? '...' : `$${formatNumber(stakedUsd.toString(), 0)}`}
          </div>
          <div className={styles.summaryBreakdown}>
            wstETH + stETH + rETH + mETH
          </div>
        </div>
      </div>

      {/* Token Balances */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('treasury.tokenBalances')}</h2>
        <div className={styles.tokenGrid}>
          {/* ETH Derivatives */}
          <div className={styles.tokenCategory}>
            <h3 className={styles.categoryTitle}>ETH Derivatives</h3>
            <div className={styles.tokenList}>
              <div className={styles.tokenItem}>
                <span className={styles.tokenSymbol}>ETH</span>
                <span className={styles.tokenBalance}>
                  {isLoading ? '...' : formatNumber(balances.eth.formatted, 4)}
                </span>
              </div>
              {balances.tokens.wstETH && (
                <div className={styles.tokenItem}>
                  <span className={styles.tokenSymbol}>wstETH</span>
                  <span className={styles.tokenBalance}>
                    {formatNumber(balances.tokens.wstETH.formatted, 4)}
                  </span>
                </div>
              )}
              {balances.tokens.stETH && (
                <div className={styles.tokenItem}>
                  <span className={styles.tokenSymbol}>stETH</span>
                  <span className={styles.tokenBalance}>
                    {formatNumber(balances.tokens.stETH.formatted, 4)}
                  </span>
                </div>
              )}
              {balances.tokens.rETH && (
                <div className={styles.tokenItem}>
                  <span className={styles.tokenSymbol}>rETH</span>
                  <span className={styles.tokenBalance}>
                    {formatNumber(balances.tokens.rETH.formatted, 4)}
                  </span>
                </div>
              )}
              {balances.tokens.mETH && (
                <div className={styles.tokenItem}>
                  <span className={styles.tokenSymbol}>mETH</span>
                  <span className={styles.tokenBalance}>
                    {formatNumber(balances.tokens.mETH.formatted, 4)}
                  </span>
                </div>
              )}
              {balances.tokens.WETH && (
                <div className={styles.tokenItem}>
                  <span className={styles.tokenSymbol}>WETH</span>
                  <span className={styles.tokenBalance}>
                    {formatNumber(balances.tokens.WETH.formatted, 4)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stablecoins */}
          <div className={styles.tokenCategory}>
            <h3 className={styles.categoryTitle}>Stablecoins</h3>
            <div className={styles.tokenList}>
              {balances.tokens.USDC && (
                <div className={styles.tokenItem}>
                  <span className={styles.tokenSymbol}>USDC</span>
                  <span className={styles.tokenBalance}>
                    {formatNumber(balances.tokens.USDC.formatted, 2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* V1 Treasury */}
          <div className={styles.tokenCategory}>
            <h3 className={styles.categoryTitle}>V1 Treasury (Legacy)</h3>
            <div className={styles.tokenList}>
              <div className={styles.tokenItem}>
                <span className={styles.tokenSymbol}>ETH</span>
                <span className={styles.tokenBalance}>
                  {v1Balances.isLoading ? '...' : formatNumber(v1Balances.eth.formatted, 4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Treasury Nouns */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Treasury Nouns ({filteredNouns.length}{hasActiveFilters ? ` of ${allTreasuryNouns.length}` : ''})
        </h2>

        {/* Trait Filters */}
        {!nounsLoading && !v1NounsLoading && allTreasuryNouns.length > 0 && (
          <div className={styles.filterContainer}>
            <div className={styles.filterRow}>
              {(['background', 'body', 'accessory', 'head', 'glasses'] as TraitType[]).map(type => (
                <TraitDropdown
                  key={type}
                  type={type}
                  options={uniqueTraits[type]}
                  value={filters[type]}
                  onChange={(value) => updateFilter(type, value)}
                />
              ))}
              {hasActiveFilters && (
                <button className={styles.clearFilters} onClick={clearFilters}>
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {nounsLoading || v1NounsLoading ? (
          <div className={styles.loading}>Loading Nouns...</div>
        ) : filteredNouns.length === 0 ? (
          <div className={styles.empty}>
            {hasActiveFilters ? 'No Nouns match the selected filters' : 'No Nouns in treasury'}
          </div>
        ) : (
          <div className={styles.nounsGrid}>
            {filteredNouns.map((noun) => (
              <div key={noun.id} className={styles.nounCard}>
                <NounImage
                  seed={{
                    background: noun.seed.background,
                    body: noun.seed.body,
                    accessory: noun.seed.accessory,
                    head: noun.seed.head,
                    glasses: noun.seed.glasses,
                  }}
                  size={64}
                  className={styles.nounImage}
                />
                <span className={styles.nounId}>#{noun.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Treasury;

