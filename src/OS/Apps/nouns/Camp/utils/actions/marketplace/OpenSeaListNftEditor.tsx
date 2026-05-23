/**
 * OpenSeaListNftEditor
 *
 * Tabbed picker for choosing which treasury NFT to list. One tab per
 * known-legit collection (Nouns / Lil Nouns / Zorbs / ENS / …) plus an
 * "Other" tab for everything else.
 *
 * Two treasuries are surfaced — V2 (current) and V1 (legacy) — because
 * both hold legitimate NFTs and which one owns the chosen NFT determines
 * which timelock has to execute the proposal. Each tab shows V2 holdings
 * first, then a V1 section underneath if anything is there. Selecting a
 * V1 NFT surfaces a hint to set `proposalType = "Timelock V1"` so the
 * proposal executes from the right contract.
 *
 * Each tab is lazy: only the active tab fetches data, and the V1 query
 * runs in parallel with the V2 one. React Query caches per-tab so flipping
 * back is instant.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseEther, parseUnits, type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import { NounImageById } from '@/app/lib/nouns/components/NounImage';
import { useMyNfts, type MyNft } from '@/app/lib/ens/hooks/useMyNfts';
import {
  useNftsByContracts,
  type OwnedNft,
} from '@/app/lib/nfts/hooks';
import {
  LEGIT_COLLECTION_TABS,
  LEGIT_CONTRACT_SET,
  tabForContract,
  type LegitCollectionTab,
} from '@/app/lib/nft-allowlist';
import type { TemplateFieldValues, TokenInfo } from '../../actionTemplates';
import { COMMON_TOKENS } from '../../actionTemplates/constants';
import { BerryLoader } from '../../../components/BerryLoader';
import { formatTokenAmount } from '../shared';
import { buildNftListingJson } from './_order-builder';
import styles from './OpenSeaListNftEditor.module.css';

interface Props {
  fieldValues: TemplateFieldValues;
  onUpdateField: (field: string, value: string) => void;
  disabled?: boolean;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const WETH = COMMON_TOKENS.find((t: TokenInfo) => t.symbol === 'WETH')!.address;
const TREASURY_V2 = NOUNS_ADDRESSES.treasury as Address;
const TREASURY_V1 = NOUNS_ADDRESSES.treasuryV1 as Address;

type SourceTreasury = 'v2' | 'v1';

const DURATION_PRESETS: Array<{ label: string; days: number }> = [
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

const CURRENCY_PRESETS = [
  { label: 'ETH', address: ZERO_ADDRESS, decimals: 18 },
  { label: 'WETH', address: WETH, decimals: 18 },
];

const FEE_BPS = 50;
const OTHER_TAB_KEY = 'other';

function treasuryAddressFor(source: SourceTreasury): Address {
  return source === 'v1' ? TREASURY_V1 : TREASURY_V2;
}

export function OpenSeaListNftEditor({
  fieldValues,
  onUpdateField,
  disabled,
}: Props) {
  // --- Field reads -------------------------------------------------------
  const selectedCollection = (fieldValues.collection ?? '').toLowerCase();
  const selectedTokenId = fieldValues.tokenId ?? '';
  // Which treasury owns the picked NFT — stored on the draft so the offerer
  // in the Seaport order matches. Defaults to V2 when not set.
  const sourceTreasury: SourceTreasury =
    fieldValues.sourceTreasury === 'v1' ? 'v1' : 'v2';
  const askAmountInput = fieldValues.askAmount ?? '';
  const askCurrency = (fieldValues.askCurrency ?? ZERO_ADDRESS) as Address;
  const durationDays = Number(fieldValues.durationDays ?? '7') || 7;
  const endTimeStored = fieldValues.endTime ?? '';

  // --- Tab state — restore from selection or default to Nouns ----------
  const initialTabKey = useMemo<string>(() => {
    if (selectedCollection) {
      const tab = tabForContract(selectedCollection);
      if (tab) return tab.key;
      return OTHER_TAB_KEY;
    }
    return LEGIT_COLLECTION_TABS[0]?.key ?? OTHER_TAB_KEY;
  }, [selectedCollection]);
  const [activeTabKey, setActiveTabKey] = useState<string>(initialTabKey);

  // --- Price math -------------------------------------------------------
  const askDecimals =
    CURRENCY_PRESETS.find(
      (c) => c.address.toLowerCase() === askCurrency.toLowerCase(),
    )?.decimals ?? 18;
  const askAmountWei = useMemo(() => {
    if (!askAmountInput) return BigInt(0);
    try {
      return askCurrency.toLowerCase() === ZERO_ADDRESS
        ? parseEther(askAmountInput)
        : parseUnits(askAmountInput, askDecimals);
    } catch {
      return BigInt(0);
    }
  }, [askAmountInput, askCurrency, askDecimals]);
  const feeWei = (askAmountWei * BigInt(FEE_BPS)) / BigInt(10_000);
  const sellerProceeds = askAmountWei - feeWei;

  // --- Expiration sync --------------------------------------------------
  useEffect(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const desiredEnd = nowSec + durationDays * 86_400;
    if (!endTimeStored) {
      onUpdateField('endTime', String(desiredEnd));
      return;
    }
    const stored = Number(endTimeStored);
    if (Math.abs(stored - desiredEnd) > 2 * 86_400) {
      onUpdateField('endTime', String(desiredEnd));
    }
  }, [durationDays, endTimeStored, onUpdateField]);

  // --- Build Order JSON whenever inputs change -------------------------
  useEffect(() => {
    if (!selectedCollection || !selectedTokenId) return;
    if (askAmountWei <= BigInt(0)) return;
    if (!endTimeStored) return;
    let tokenId: bigint;
    try {
      tokenId = BigInt(selectedTokenId);
    } catch {
      return;
    }
    const orderJson = buildNftListingJson({
      offerer: treasuryAddressFor(sourceTreasury),
      collection: selectedCollection as Address,
      tokenId,
      askCurrency,
      askAmount: askAmountWei,
      startTime: BigInt(0),
      endTime: BigInt(endTimeStored),
    });
    if (orderJson !== fieldValues.order) {
      onUpdateField('order', orderJson);
    }
  }, [
    selectedCollection,
    selectedTokenId,
    sourceTreasury,
    askAmountWei,
    askCurrency,
    endTimeStored,
    fieldValues.order,
    onUpdateField,
  ]);

  const expirationDisplay = useMemo(() => {
    if (!endTimeStored) return '';
    return `Expires ${new Date(Number(endTimeStored) * 1000).toLocaleString()}`;
  }, [endTimeStored]);

  const selectNft = (
    contract: string,
    tokenId: string,
    source: SourceTreasury,
  ) => {
    onUpdateField('collection', contract);
    onUpdateField('tokenId', tokenId);
    onUpdateField('sourceTreasury', source);
  };

  // --- Tab list with the synthetic "Other" tab appended ----------------
  const tabs: Array<LegitCollectionTab | { key: string; label: string }> =
    useMemo(() => [...LEGIT_COLLECTION_TABS, { key: OTHER_TAB_KEY, label: 'Other' }], []);

  const activeLegitTab = useMemo(
    () => LEGIT_COLLECTION_TABS.find((t) => t.key === activeTabKey) ?? null,
    [activeTabKey],
  );

  return (
    <div className={styles.editor}>
      {/* Tab bar */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Treasury NFT to list</label>
        <div className={styles.tabBar} role="tablist">
          {tabs.map((tab) => (
            <TabButton
              key={tab.key}
              tab={tab}
              active={tab.key === activeTabKey}
              disabled={disabled}
              onClick={() => setActiveTabKey(tab.key)}
            />
          ))}
        </div>
      </div>

      {/* Active tab content */}
      <div className={styles.tabPanel} role="tabpanel">
        {activeLegitTab ? (
          <LegitCollectionPanel
            tab={activeLegitTab}
            selectedContract={selectedCollection}
            selectedTokenId={selectedTokenId}
            selectedSource={sourceTreasury}
            disabled={disabled}
            onSelect={selectNft}
          />
        ) : (
          <OtherCollectionsPanel
            selectedContract={selectedCollection}
            selectedTokenId={selectedTokenId}
            selectedSource={sourceTreasury}
            disabled={disabled}
            onSelect={selectNft}
          />
        )}
      </div>

      {/* V1 timelock warning */}
      {sourceTreasury === 'v1' && selectedCollection && (
        <div className={styles.v1Warning}>
          <strong>V1 Treasury NFT selected.</strong> Make sure to set{' '}
          <code>Proposal Type</code> to{' '}
          <strong>Timelock V1</strong> on this proposal so it executes from
          the V1 timelock that owns this NFT. A standard proposal would
          revert.
        </div>
      )}

      {/* Currency selector */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Ask Currency</label>
        <div className={styles.chipRow}>
          {CURRENCY_PRESETS.map((c) => (
            <button
              key={c.address}
              type="button"
              className={`${styles.chip} ${
                askCurrency.toLowerCase() === c.address.toLowerCase()
                  ? styles.active
                  : ''
              }`}
              onClick={() => onUpdateField('askCurrency', c.address)}
              disabled={disabled}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ask amount */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          Ask Price (gross — fee deducted from this)
        </label>
        <input
          type="text"
          inputMode="decimal"
          className={styles.fieldInput}
          value={askAmountInput}
          onChange={(e) => onUpdateField('askAmount', e.target.value)}
          placeholder="10.0"
          disabled={disabled}
        />
      </div>

      {/* Duration */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Listing Duration</label>
        <div className={styles.chipRow}>
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.days}
              type="button"
              className={`${styles.chip} ${
                durationDays === preset.days ? styles.active : ''
              }`}
              onClick={() => {
                onUpdateField('durationDays', String(preset.days));
                onUpdateField('endTime', '');
              }}
              disabled={disabled}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {expirationDisplay && (
          <p className={styles.expirationLine}>{expirationDisplay}</p>
        )}
      </div>

      {/* Fee preview */}
      {askAmountWei > BigInt(0) && (
        <div className={styles.feePreview}>
          <div className={styles.feeRow}>
            <span className={styles.feeLabel}>Listing price (gross)</span>
            <span className={styles.feeValue}>
              {formatTokenAmount(askAmountWei, askDecimals)}{' '}
              {askCurrency.toLowerCase() === ZERO_ADDRESS ? 'ETH' : 'WETH'}
            </span>
          </div>
          <div className={styles.feeRow}>
            <span className={styles.feeLabel}>
              OpenSea fee ({FEE_BPS / 100}%)
            </span>
            <span className={styles.feeValue}>
              {formatTokenAmount(feeWei, askDecimals)}{' '}
              {askCurrency.toLowerCase() === ZERO_ADDRESS ? 'ETH' : 'WETH'}
            </span>
          </div>
          <div className={`${styles.feeRow} ${styles.feeTotal}`}>
            <span className={styles.feeLabel}>Treasury receives</span>
            <span className={styles.feeValue}>
              {formatTokenAmount(sellerProceeds, askDecimals)}{' '}
              {askCurrency.toLowerCase() === ZERO_ADDRESS ? 'ETH' : 'WETH'}
            </span>
          </div>
        </div>
      )}

      <p className={styles.fieldHint}>
        The proposal calls <code>NFT.setApprovalForAll(OpenSeaConduit, true)</code>{' '}
        and <code>Seaport.validate(order)</code>. After execution the listing
        is authorised on-chain; OpenSea&apos;s UI displays it only once the
        order body is POSTed to their API (out-of-band today).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button — shows combined V2+V1 count when active
// ---------------------------------------------------------------------------

interface TabButtonProps {
  tab: { key: string; label: string };
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function TabButton({ tab, active, disabled, onClick }: TabButtonProps) {
  const isLegit = tab.key !== OTHER_TAB_KEY;
  const legitTab = isLegit
    ? LEGIT_COLLECTION_TABS.find((t) => t.key === tab.key)
    : undefined;
  // Only query when the tab is active to keep idle tabs cheap.
  const v2 = useNftsByContracts(
    isLegit && active ? TREASURY_V2 : undefined,
    legitTab?.contracts,
  );
  const v1 = useNftsByContracts(
    isLegit && active ? TREASURY_V1 : undefined,
    legitTab?.contracts,
  );
  const totalCount =
    v2.data || v1.data
      ? (v2.data?.nfts.length ?? 0) + (v1.data?.nfts.length ?? 0)
      : undefined;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`${styles.tab} ${active ? styles.tabActive : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{tab.label}</span>
      {isLegit && active ? (
        <span className={styles.tabCount}>
          {totalCount === undefined ? '…' : totalCount}
        </span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Per-collection panel — V2 + V1 sections
// ---------------------------------------------------------------------------

interface LegitCollectionPanelProps {
  tab: LegitCollectionTab;
  selectedContract: string;
  selectedTokenId: string;
  selectedSource: SourceTreasury;
  disabled?: boolean;
  onSelect: (
    contract: string,
    tokenId: string,
    source: SourceTreasury,
  ) => void;
}

function LegitCollectionPanel({
  tab,
  selectedContract,
  selectedTokenId,
  selectedSource,
  disabled,
  onSelect,
}: LegitCollectionPanelProps) {
  const v2 = useNftsByContracts(TREASURY_V2, tab.contracts);
  const v1 = useNftsByContracts(TREASURY_V1, tab.contracts);

  // `isLoading` is the FIRST-page load only — after that, the hook
  // auto-fetches subsequent pages internally. `isFetchingMore` covers
  // pages 2+ so we can show a "loading more" indicator while a big
  // collection (e.g., 800+ V1 Lil Nouns) finishes streaming in.
  const isLoading = v2.isLoading || v1.isLoading;
  const isFetchingMore = v2.isFetchingMore || v1.isFetchingMore;
  const firstError = (v2.error || v1.error) as Error | null;
  const v2Nfts = useMemo(
    () => sortNfts(v2.data?.nfts ?? []),
    [v2.data?.nfts],
  );
  const v1Nfts = useMemo(
    () => sortNfts(v1.data?.nfts ?? []),
    [v1.data?.nfts],
  );
  // Alchemy's totalCount lets us show "loaded X of Y" while pages stream.
  const v2TotalCount = v2.data?.totalCount ?? v2Nfts.length;
  const v1TotalCount = v1.data?.totalCount ?? v1Nfts.length;
  const totalLoaded = v2Nfts.length + v1Nfts.length;
  const totalExpected = v2TotalCount + v1TotalCount;

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <BerryLoader />
        <p>Loading {tab.label}…</p>
      </div>
    );
  }
  if (firstError) {
    return (
      <div className={styles.errorState}>
        Failed to load {tab.label}: {firstError.message}
      </div>
    );
  }
  if (v2Nfts.length === 0 && v1Nfts.length === 0) {
    return (
      <p className={styles.emptyState}>
        Neither treasury holds any {tab.label} right now.
      </p>
    );
  }

  return (
    <>
      <div className={styles.tabPanelHeader}>
        <span>
          {isFetchingMore && totalExpected > totalLoaded ? (
            <>
              <strong>{totalLoaded}</strong> of{' '}
              <strong>{totalExpected}</strong> {tab.label} loaded
              <span className={styles.fetchingMoreInline}>
                {' '}— loading more…
              </span>
            </>
          ) : (
            <>
              <strong>{totalLoaded}</strong> {tab.label} held across both
              treasuries
            </>
          )}
        </span>
      </div>
      {v2Nfts.length > 0 && (
        <TreasurySection
          label="V2 Treasury"
          source="v2"
          nfts={v2Nfts}
          renderHint={tab.renderHint}
          selectedContract={selectedContract}
          selectedTokenId={selectedTokenId}
          selectedSource={selectedSource}
          disabled={disabled}
          onSelect={onSelect}
        />
      )}
      {v1Nfts.length > 0 && (
        <TreasurySection
          label="V1 Treasury (legacy)"
          source="v1"
          nfts={v1Nfts}
          renderHint={tab.renderHint}
          selectedContract={selectedContract}
          selectedTokenId={selectedTokenId}
          selectedSource={selectedSource}
          disabled={disabled}
          onSelect={onSelect}
        />
      )}
    </>
  );
}

function sortNfts(nfts: readonly OwnedNft[]): OwnedNft[] {
  return [...nfts].sort((a, b) => {
    const an = Number(a.tokenId);
    const bn = Number(b.tokenId);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return a.tokenId.localeCompare(b.tokenId);
  });
}

// ---------------------------------------------------------------------------
// Treasury-scoped subsection inside a collection tab
// ---------------------------------------------------------------------------

interface TreasurySectionProps {
  label: string;
  source: SourceTreasury;
  nfts: OwnedNft[];
  renderHint: 'nouns' | 'default';
  selectedContract: string;
  selectedTokenId: string;
  selectedSource: SourceTreasury;
  disabled?: boolean;
  onSelect: (
    contract: string,
    tokenId: string,
    source: SourceTreasury,
  ) => void;
}

function TreasurySection({
  label,
  source,
  nfts,
  renderHint,
  selectedContract,
  selectedTokenId,
  selectedSource,
  disabled,
  onSelect,
}: TreasurySectionProps) {
  return (
    <div className={styles.treasurySection}>
      <div className={styles.treasurySectionHeader}>
        <span className={styles.treasurySectionLabel}>{label}</span>
        <span className={styles.treasurySectionCount}>
          {nfts.length} held
        </span>
      </div>
      <div className={styles.nounGrid}>
        {nfts.map((nft) => (
          <NftCard
            key={`${source}-${nft.contract}-${nft.tokenId}`}
            nft={nft}
            renderHint={renderHint}
            source={source}
            selected={
              selectedContract === nft.contract.toLowerCase() &&
              selectedTokenId === nft.tokenId &&
              selectedSource === source
            }
            disabled={disabled}
            onSelect={() => onSelect(nft.contract, nft.tokenId, source)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Other" panel — both treasuries' non-allowlisted holdings
// ---------------------------------------------------------------------------

interface OtherCollectionsPanelProps {
  selectedContract: string;
  selectedTokenId: string;
  selectedSource: SourceTreasury;
  disabled?: boolean;
  onSelect: (
    contract: string,
    tokenId: string,
    source: SourceTreasury,
  ) => void;
}

const AUTO_PAGINATE_TARGET = 20;
const AUTO_PAGINATE_MAX_PAGES = 8;

function OtherCollectionsPanel({
  selectedContract,
  selectedTokenId,
  selectedSource,
  disabled,
  onSelect,
}: OtherCollectionsPanelProps) {
  // Both treasuries' catch-all holdings. Each uses the existing paginated
  // hook with the phishing heuristic. We auto-paginate both in parallel
  // until we have a reasonable number of NFTs to show.
  const v2Query = useMyNfts(TREASURY_V2);
  const v1Query = useMyNfts(TREASURY_V1);

  const v2Nfts = useMemo<MyNft[]>(
    () =>
      v2Query.data?.pages
        .flatMap((p) => p.nfts)
        .filter((n) => !LEGIT_CONTRACT_SET.has(n.contract.toLowerCase())) ??
      [],
    [v2Query.data],
  );
  const v1Nfts = useMemo<MyNft[]>(
    () =>
      v1Query.data?.pages
        .flatMap((p) => p.nfts)
        .filter((n) => !LEGIT_CONTRACT_SET.has(n.contract.toLowerCase())) ??
      [],
    [v1Query.data],
  );

  // Auto-paginate the V2 side; V1 holds far fewer NFTs and usually
  // resolves in one page.
  const v2PagesLoaded = v2Query.data?.pages.length ?? 0;
  useEffect(() => {
    if (
      v2Query.isLoading ||
      v2Query.isFetchingNextPage ||
      !v2Query.hasNextPage
    )
      return;
    if (v2Nfts.length >= AUTO_PAGINATE_TARGET) return;
    if (v2PagesLoaded >= AUTO_PAGINATE_MAX_PAGES) return;
    v2Query.fetchNextPage();
  }, [v2Query, v2Nfts.length, v2PagesLoaded]);

  // Same for V1, but with a lower target since the V1 treasury is small.
  const v1PagesLoaded = v1Query.data?.pages.length ?? 0;
  useEffect(() => {
    if (
      v1Query.isLoading ||
      v1Query.isFetchingNextPage ||
      !v1Query.hasNextPage
    )
      return;
    if (v1Nfts.length >= AUTO_PAGINATE_TARGET) return;
    if (v1PagesLoaded >= AUTO_PAGINATE_MAX_PAGES) return;
    v1Query.fetchNextPage();
  }, [v1Query, v1Nfts.length, v1PagesLoaded]);

  const isLoading = v2Query.isLoading || v1Query.isLoading;

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <BerryLoader />
        <p>Loading other NFTs…</p>
      </div>
    );
  }

  if (v2Nfts.length === 0 && v1Nfts.length === 0) {
    return (
      <p className={styles.emptyState}>
        No other NFTs found in either treasury. Anything from a known
        collection is in its own tab; suspected phishing is filtered out.
      </p>
    );
  }

  return (
    <>
      <div className={styles.tabPanelHeader}>
        <span>
          <strong>{v2Nfts.length + v1Nfts.length}</strong> other NFT
          {v2Nfts.length + v1Nfts.length === 1 ? '' : 's'} held
        </span>
      </div>
      {v2Nfts.length > 0 && (
        <OtherTreasurySection
          label="V2 Treasury"
          source="v2"
          nfts={v2Nfts}
          query={v2Query}
          selectedContract={selectedContract}
          selectedTokenId={selectedTokenId}
          selectedSource={selectedSource}
          disabled={disabled}
          onSelect={onSelect}
        />
      )}
      {v1Nfts.length > 0 && (
        <OtherTreasurySection
          label="V1 Treasury (legacy)"
          source="v1"
          nfts={v1Nfts}
          query={v1Query}
          selectedContract={selectedContract}
          selectedTokenId={selectedTokenId}
          selectedSource={selectedSource}
          disabled={disabled}
          onSelect={onSelect}
        />
      )}
    </>
  );
}

interface OtherTreasurySectionProps {
  label: string;
  source: SourceTreasury;
  nfts: MyNft[];
  query: ReturnType<typeof useMyNfts>;
  selectedContract: string;
  selectedTokenId: string;
  selectedSource: SourceTreasury;
  disabled?: boolean;
  onSelect: (
    contract: string,
    tokenId: string,
    source: SourceTreasury,
  ) => void;
}

function OtherTreasurySection({
  label,
  source,
  nfts,
  query,
  selectedContract,
  selectedTokenId,
  selectedSource,
  disabled,
  onSelect,
}: OtherTreasurySectionProps) {
  // Group by contract for clarity, sort groups by size desc.
  const grouped = useMemo(() => {
    const map = new Map<string, MyNft[]>();
    for (const n of nfts) {
      const key = n.contract.toLowerCase();
      const arr = map.get(key) ?? [];
      arr.push(n);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => b.length - a.length);
  }, [nfts]);

  return (
    <div className={styles.treasurySection}>
      <div className={styles.treasurySectionHeader}>
        <span className={styles.treasurySectionLabel}>{label}</span>
        <span className={styles.treasurySectionCount}>
          {nfts.length} held
          {query.hasNextPage && (
            <>
              {' '}
              <button
                type="button"
                className={styles.chip}
                onClick={() => query.fetchNextPage()}
                disabled={disabled || query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </>
          )}
        </span>
      </div>
      {grouped.map(([contract, items]) => {
        const collectionName =
          items[0]?.collectionName ||
          `${contract.slice(0, 6)}…${contract.slice(-4)}`;
        return (
          <div key={contract} className={styles.otherCollectionGroup}>
            <div className={styles.otherCollectionGroupHeader}>
              {collectionName} — {items.length} held
            </div>
            <div className={styles.nounGrid}>
              {items.map((nft) => (
                <NftCard
                  key={`${source}-${nft.contract}-${nft.tokenId}`}
                  nft={nft as OwnedNft}
                  renderHint="default"
                  source={source}
                  selected={
                    selectedContract === nft.contract.toLowerCase() &&
                    selectedTokenId === nft.tokenId &&
                    selectedSource === source
                  }
                  disabled={disabled}
                  onSelect={() =>
                    onSelect(nft.contract, nft.tokenId, source)
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NFT card
// ---------------------------------------------------------------------------

interface NftCardProps {
  nft: OwnedNft;
  renderHint: 'nouns' | 'default';
  source: SourceTreasury;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

function NftCard({
  nft,
  renderHint,
  source,
  selected,
  disabled,
  onSelect,
}: NftCardProps) {
  const cardClass = [
    styles.nounCard,
    selected ? styles.selected : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={disabled ? -1 : 0}
      className={cardClass}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect();
        }
      }}
      title={`${nft.name ?? `#${nft.tokenId}`} — ${source === 'v1' ? 'V1' : 'V2'} treasury`}
    >
      <div className={styles.nounImageWrap}>
        {renderHint === 'nouns' ? (
          <NounImageById id={Number(nft.tokenId)} size={64} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={nft.image}
            alt={nft.name ?? `Token ${nft.tokenId}`}
            className={styles.externalNftImage}
          />
        )}
      </div>
      <span className={styles.nounId}>#{shortenTokenId(nft.tokenId)}</span>
    </div>
  );
}

function shortenTokenId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-3)}`;
}
