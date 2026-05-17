/**
 * Balances Tab — treasury holdings valued via Alchemy.
 *
 * Replaces the previous on-chain useReadContracts approach. The Alchemy
 * route (a) values appreciating LSTs (wstETH, rETH, mETH) at their real USD
 * price instead of 1:1 with ETH, and (b) discovers all ERC-20 holdings
 * above the dust filter rather than just a hand-curated allowlist.
 */

'use client';

import { useMemo, useState } from 'react';
import { useTreasuryFullBalances, useTreasuryNouns, useTreasuryV1Nouns } from '@/app/lib/nouns/hooks';
import type { TreasuryBalancesResponse } from '@/app/api/nouns/treasury/balances/route';
import { NounImage } from '@/app/lib/nouns/components';
import { getTraitName, type TraitType } from '@/app/lib/nouns/utils/trait-name-utils';
import { useTranslation } from '@/OS/lib/i18n';
import { TraitDropdown } from '../components';
import { Address } from './Address';
import styles from '../Treasury.module.css';

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

interface TraitFilters {
  background: number | null;
  body: number | null;
  accessory: number | null;
  head: number | null;
  glasses: number | null;
}

function formatUsd(value: number, decimals = 0): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatToken(value: string | number, decimals = 4): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: Math.min(decimals, 2),
    maximumFractionDigits: decimals,
  });
}

export function BalancesTab() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useTreasuryFullBalances();
  const { data: nounsData, isLoading: nounsLoading } = useTreasuryNouns();
  const { data: v1NounsData, isLoading: v1NounsLoading } = useTreasuryV1Nouns();

  const [filters, setFilters] = useState<TraitFilters>({
    background: null,
    body: null,
    accessory: null,
    head: null,
    glasses: null,
  });

  const treasuryNouns = (nounsData?.nouns ?? []) as TreasuryNoun[];
  const v1TreasuryNouns = (v1NounsData?.nouns ?? []) as TreasuryNoun[];

  const allTreasuryNouns = useMemo(
    () => [...treasuryNouns, ...v1TreasuryNouns].sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10)),
    [treasuryNouns, v1TreasuryNouns],
  );

  const uniqueTraits = useMemo(() => {
    const traits: Record<TraitType, Set<number>> = {
      background: new Set(),
      body: new Set(),
      accessory: new Set(),
      head: new Set(),
      glasses: new Set(),
    };

    allTreasuryNouns.forEach((noun) => {
      traits.background.add(noun.seed.background);
      traits.body.add(noun.seed.body);
      traits.accessory.add(noun.seed.accessory);
      traits.head.add(noun.seed.head);
      traits.glasses.add(noun.seed.glasses);
    });

    const traitOptions: Record<TraitType, { value: number; name: string }[]> = {
      background: [],
      body: [],
      accessory: [],
      head: [],
      glasses: [],
    };

    (Object.keys(traits) as TraitType[]).forEach((type) => {
      traitOptions[type] = Array.from(traits[type])
        .map((value) => ({ value, name: getTraitName(type, value) }))
        .sort((a, b) => a.name.localeCompare(b.name));
    });

    return traitOptions;
  }, [allTreasuryNouns]);

  const filteredNouns = useMemo(() => {
    return allTreasuryNouns.filter((noun) => {
      if (filters.background !== null && noun.seed.background !== filters.background) return false;
      if (filters.body !== null && noun.seed.body !== filters.body) return false;
      if (filters.accessory !== null && noun.seed.accessory !== filters.accessory) return false;
      if (filters.head !== null && noun.seed.head !== filters.head) return false;
      if (filters.glasses !== null && noun.seed.glasses !== filters.glasses) return false;
      return true;
    });
  }, [allTreasuryNouns, filters]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== null);

  const clearFilters = () => {
    setFilters({ background: null, body: null, accessory: null, head: null, glasses: null });
  };

  const updateFilter = (type: TraitType, value: number | null) => {
    setFilters((prev) => ({ ...prev, [type]: value }));
  };

  if (error) {
    return <div className={styles.empty}>Failed to load treasury balances.</div>;
  }
  if (isLoading || !data) {
    return <div className={styles.loading}>Loading treasury balances…</div>;
  }

  const { combined, v2, v1, ethPriceUsd, fetchedAt } = data;

  return (
    <div>
      {/* Contract Addresses */}
      <div className={styles.section}>
        <div className={styles.addressList}>
          <div className={styles.addressItem}>
            <span className={styles.addressLabel}>Treasury V2</span>
            <Address address={v2.address} className={styles.address} full />
          </div>
          <div className={styles.addressItem}>
            <span className={styles.addressLabel}>Treasury V1</span>
            <Address address={v1.address} className={styles.address} full />
          </div>
        </div>
      </div>

      {/* Headline total */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total treasury value</div>
          <div className={styles.summaryValue}>{formatUsd(combined.totalUsd)}</div>
          <div className={styles.summaryBreakdown}>
            ETH @ {formatUsd(ethPriceUsd, 0)} · refreshed {new Date(fetchedAt).toLocaleTimeString()}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Nouns held</div>
          <div className={styles.summaryValue}>
            {nounsLoading || v1NounsLoading ? '...' : allTreasuryNouns.length}
          </div>
          <div className={styles.summaryBreakdown}>Not included in USD total</div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('treasury.immediatelySpendable')}</div>
          <div className={styles.statValue}>{formatUsd(combined.immediatelySpendableUsd)}</div>
          <div className={styles.statSubtext}>ETH + WETH + stablecoins</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>{t('treasury.stakedAssets')}</div>
          <div className={styles.statValue}>{formatUsd(combined.stakedEthDerivativesUsd)}</div>
          <div className={styles.statSubtext}>wstETH + stETH + rETH + mETH</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Native ETH</div>
          <div className={styles.statValue}>{formatUsd(combined.nativeEthValueUsd)}</div>
          <div className={styles.statSubtext}>V1 + V2 treasuries</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Other tokens</div>
          <div className={styles.statValue}>{formatUsd(combined.otherTokensUsd)}</div>
          <div className={styles.statSubtext}>Above ${'>'}$100 threshold</div>
        </div>
      </div>

      {/* Token table — collapsed by default to keep the snapshot tidy */}
      <details>
        <summary className={styles.subHeader} style={{ cursor: 'pointer' }}>
          Holdings ({v2.tokens.length + v1.tokens.length + (v2.nativeEth.valueUsd > 0 ? 1 : 0) + (v1.nativeEth.valueUsd > 0 ? 1 : 0)})
        </summary>
        <HoldingsTable data={data} />

        {data.unpricedTokens.length > 0 && (
          <details style={{ marginTop: 12, fontSize: 10, color: 'var(--berry-text-muted)' }}>
            <summary style={{ cursor: 'pointer' }}>
              {data.unpricedTokens.length} unpriced tokens hidden (likely airdrop spam)
            </summary>
            <ul style={{ marginTop: 8, paddingLeft: 16 }}>
              {data.unpricedTokens.map((t) => (
                <li key={t.address}>
                  {t.symbol} — <Address address={t.address} className={styles.mono} />
                </li>
              ))}
            </ul>
          </details>
        )}
      </details>

      {/* Treasury Nouns */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Treasury Nouns ({filteredNouns.length}
          {hasActiveFilters ? ` of ${allTreasuryNouns.length}` : ''})
        </h2>

        {!nounsLoading && !v1NounsLoading && allTreasuryNouns.length > 0 && (
          <div className={styles.filterContainer}>
            <div className={styles.filterRow}>
              {(['background', 'body', 'accessory', 'head', 'glasses'] as TraitType[]).map((type) => (
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

function HoldingsTable({ data }: { data: TreasuryBalancesResponse }) {
  type Row = {
    symbol: string;
    name: string;
    treasury: 'V1' | 'V2';
    balance: string;
    priceUsd: number | null;
    valueUsd: number;
  };

  const rows: Row[] = [];

  if (data.v2.nativeEth.valueUsd > 0) {
    rows.push({
      symbol: 'ETH',
      name: 'Ether',
      treasury: 'V2',
      balance: data.v2.nativeEth.formatted,
      priceUsd: data.ethPriceUsd,
      valueUsd: data.v2.nativeEth.valueUsd,
    });
  }
  for (const t of data.v2.tokens) {
    rows.push({
      symbol: t.symbol,
      name: t.name,
      treasury: 'V2',
      balance: t.formattedBalance,
      priceUsd: t.priceUsd,
      valueUsd: t.valueUsd,
    });
  }
  if (data.v1.nativeEth.valueUsd > 0) {
    rows.push({
      symbol: 'ETH',
      name: 'Ether',
      treasury: 'V1',
      balance: data.v1.nativeEth.formatted,
      priceUsd: data.ethPriceUsd,
      valueUsd: data.v1.nativeEth.valueUsd,
    });
  }
  for (const t of data.v1.tokens) {
    rows.push({
      symbol: t.symbol,
      name: t.name,
      treasury: 'V1',
      balance: t.formattedBalance,
      priceUsd: t.priceUsd,
      valueUsd: t.valueUsd,
    });
  }

  rows.sort((a, b) => b.valueUsd - a.valueUsd);

  return (
    <div className={styles.tableScroll}>
      <table className={styles.activityTable}>
        <thead>
          <tr>
            <th>Token</th>
            <th>Treasury</th>
            <th>Balance</th>
            <th>Price</th>
            <th>USD value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.treasury}-${r.symbol}-${i}`}>
              <td>
                <strong>{r.symbol}</strong>
                <div className={styles.metricSub}>{r.name}</div>
              </td>
              <td className={styles.mono}>{r.treasury}</td>
              <td>{formatToken(r.balance, r.symbol === 'USDC' ? 2 : 4)}</td>
              <td>{r.priceUsd === null ? '—' : formatUsd(r.priceUsd, 2)}</td>
              <td>{formatUsd(r.valueUsd, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
