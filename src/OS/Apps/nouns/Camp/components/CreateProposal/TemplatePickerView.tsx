/**
 * TemplatePickerView
 * Pure picker UI — search input + category tabs + card grid (with DAO Admin
 * sub-groups). No modal chrome; meant to be embedded inside a modal (or any
 * other container).
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './TemplatePickerView.module.css';

export interface TemplateOption {
  value: string;
  label: string;
  description?: string;
}

export interface TemplateGroup {
  label: string;
  options: TemplateOption[];
}

interface TemplatePickerViewProps {
  groups: TemplateGroup[];
  /** Currently-selected template id (used to highlight a card). */
  value?: string;
  /** Called when a card is clicked. */
  onSelect: (value: string) => void;
  /** Auto-focus the search input on mount. Default true. */
  autoFocusSearch?: boolean;
  /** Initial active tab; defaults to first non-empty group. */
  initialTab?: string;
}

// Sub-groups inside the DAO Admin tab. The admin tab pools governance admin
// (admin-*) and on-chain artwork admin (descriptor-*) templates together,
// since they're all admin-level powers exercised via proposals. Detection
// is by value prefix so it works for both top-level ("DAO Admin Functions")
// and inner-meta ("DAO Admin") group labels.
//
// Sub-tabs are ordered by how often they're typically touched (most-used
// first), and within each sub-tab the IDs are ordered by concern:
// params → bounds → pause/emergency → operations → wiring/ownership.
const ADMIN_SUBGROUPS: Array<{ label: string; ids: string[] }> = [
  {
    label: 'Voting',
    ids: [
      'admin-voting-delay',
      'admin-voting-period',
      'admin-proposal-threshold',
      'admin-last-minute-window',
      'admin-objection-period',
      'admin-updatable-period',
    ],
  },
  {
    label: 'Quorum',
    ids: [
      'admin-min-quorum',
      'admin-max-quorum',
      'admin-quorum-coefficient',
      'admin-dynamic-quorum',
    ],
  },
  {
    label: 'Auction',
    ids: [
      'admin-auction-reserve-price',
      'admin-auction-min-bid-increment',
      'admin-auction-time-buffer',
      'admin-auction-sanctions-oracle',
      'admin-auction-pause',
      'admin-auction-unpause',
    ],
  },
  {
    label: 'Client Rewards',
    ids: [
      'admin-rewards-auction-params',
      'admin-rewards-proposal-params',
      'admin-rewards-client-approval',
      'admin-rewards-enable-auction',
      'admin-rewards-disable-auction',
      'admin-rewards-enable-proposal',
      'admin-rewards-disable-proposal',
      'admin-rewards-withdraw-token',
      'admin-rewards-admin',
      'admin-rewards-transfer-ownership',
      'admin-rewards-descriptor',
      'admin-rewards-eth-token',
    ],
  },
  {
    label: 'Buyer / Payer',
    ids: [
      // TokenBuyer params
      'admin-tokenbuyer-baseline',
      'admin-tokenbuyer-discount',
      // Bounds the admin may operate within
      'admin-tokenbuyer-max-baseline',
      'admin-tokenbuyer-min-baseline',
      'admin-tokenbuyer-max-discount',
      'admin-tokenbuyer-min-discount',
      // Pause / emergency
      'admin-tokenbuyer-pause',
      'admin-tokenbuyer-unpause',
      // Sweeps
      'admin-tokenbuyer-withdraw-eth',
      'admin-payer-withdraw-usdc',
      // Wiring & ownership
      'admin-tokenbuyer-admin',
      'admin-tokenbuyer-price-feed',
      'admin-tokenbuyer-payer',
      'admin-tokenbuyer-transfer-ownership',
      'admin-payer-transfer-ownership',
    ],
  },
  {
    label: 'Artwork',
    ids: [
      // Trait submissions (signed CC0 contributions)
      'descriptor-add-trait-head',
      'descriptor-add-trait-body',
      'descriptor-add-trait-accessory',
      'descriptor-add-trait-glasses',
      // Visibility / output mode
      'descriptor-toggle-data-uri',
      'descriptor-set-base-uri',
      // Wiring the rendering pipeline
      'descriptor-set-art',
      'descriptor-set-renderer',
      'descriptor-set-art-descriptor',
      'descriptor-set-art-inflator',
      // Background palette additions
      'descriptor-add-background',
      'descriptor-add-many-backgrounds',
      // Irreversible lock + ownership
      'descriptor-lock-parts',
      'descriptor-transfer-ownership',
    ],
  },
  {
    label: 'Candidates',
    ids: [
      'admin-data-create-cost',
      'admin-data-update-cost',
      'admin-data-fee-recipient',
      'admin-data-withdraw-eth',
      'admin-data-duna-admin',
    ],
  },
  {
    label: 'Nouns Token',
    ids: [
      'admin-token-minter',
      'admin-token-descriptor',
      'admin-token-seeder',
      'admin-token-contract-uri-hash',
      'admin-token-nounders-dao',
    ],
  },
  {
    label: 'Governance',
    ids: [
      'admin-pending-admin',
      'admin-timelock-admin',
      'admin-timelock-delay',
    ],
  },
  {
    label: 'Fork',
    ids: [
      // Params
      'admin-fork-period',
      'admin-fork-threshold',
      // Wiring
      'admin-fork-deployer',
      'admin-fork-escrow',
      'admin-fork-tokens',
      // Escrow operations
      'admin-fork-escrow-close',
      'admin-fork-escrow-withdraw-tokens',
      'admin-fork-escrow-return-tokens',
    ],
  },
];

function isAdminGroup(group: TemplateGroup): boolean {
  return (
    group.options.length > 0 &&
    group.options.every(
      (opt) =>
        opt.value.startsWith('admin-') || opt.value.startsWith('descriptor-'),
    )
  );
}

export function TemplatePickerView({
  groups,
  value = '',
  onSelect,
  autoFocusSearch = true,
  initialTab,
}: TemplatePickerViewProps) {
  const nonEmptyGroups = groups.filter((g) => g.options.length > 0);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(
    initialTab || nonEmptyGroups[0]?.label || '',
  );
  // Secondary tab state used only inside the DAO Admin tab. Seeded from the
  // currently-selected template's sub-group so "back" preserves it; falls
  // back to the first sub-group otherwise.
  const [activeAdminSub, setActiveAdminSub] = useState<string>(() => {
    if (value) {
      const match = ADMIN_SUBGROUPS.find((sub) => sub.ids.includes(value));
      if (match) return match.label;
    }
    return ADMIN_SUBGROUPS[0].label;
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocusSearch) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [autoFocusSearch]);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchResults: Array<TemplateOption & { group: string }> | null =
    trimmedQuery
      ? nonEmptyGroups.flatMap((group) =>
          group.options
            .filter(
              (opt) =>
                opt.label.toLowerCase().includes(trimmedQuery) ||
                opt.description?.toLowerCase().includes(trimmedQuery) ||
                group.label.toLowerCase().includes(trimmedQuery),
            )
            .map((opt) => ({ ...opt, group: group.label })),
        )
      : null;

  const activeGroup =
    nonEmptyGroups.find((g) => g.label === activeTab) || nonEmptyGroups[0];

  // Compute admin sub-section data at the component level so the sub-tab row
  // can render OUTSIDE the scrolling body (as a peer of the main tab row).
  // Result is non-null only when the active tab is the admin group and there
  // is no active search.
  const adminSubSections = (() => {
    if (!activeGroup || searchResults) return null;
    if (!isAdminGroup(activeGroup)) return null;
    const optsById = new Map(activeGroup.options.map((o) => [o.value, o]));
    const placed = new Set<string>();
    const sections = ADMIN_SUBGROUPS.map((sub) => {
      const items = sub.ids
        .map((id) => optsById.get(id))
        .filter((o): o is TemplateOption => !!o);
      items.forEach((o) => placed.add(o.value));
      return { label: sub.label, items };
    });
    const leftovers = activeGroup.options.filter((o) => !placed.has(o.value));
    if (leftovers.length > 0) {
      sections.push({ label: 'Other', items: leftovers });
    }
    const visible = sections.filter((s) => s.items.length > 0);
    const current =
      visible.find((s) => s.label === activeAdminSub) || visible[0];
    return { visible, current };
  })();

  const renderCard = (opt: TemplateOption, groupHint?: string) => (
    <button
      key={opt.value}
      type="button"
      className={`${styles.card} ${value === opt.value ? styles.cardSelected : ''}`}
      onClick={() => onSelect(opt.value)}
      role="option"
      aria-selected={value === opt.value}
    >
      <span className={styles.cardLabel}>{opt.label}</span>
      {opt.description && (
        <span className={styles.cardDescription}>{opt.description}</span>
      )}
      {groupHint && <span className={styles.cardGroupHint}>{groupHint}</span>}
    </button>
  );

  const renderBody = () => {
    if (searchResults) {
      if (searchResults.length === 0) {
        return (
          <div className={styles.noResults}>
            No transactions match &quot;{searchQuery}&quot;
          </div>
        );
      }
      return (
        <div className={styles.cardGrid} role="listbox">
          {searchResults.map((opt) => renderCard(opt, opt.group))}
        </div>
      );
    }

    if (!activeGroup) return null;

    // Admin tab: the sub-tab row is rendered outside the scrolling body (see
    // the return JSX below). Body only contains the active sub-section's
    // cards so they're the only thing that scrolls.
    if (adminSubSections) {
      return (
        <div className={styles.cardGrid} role="listbox">
          {adminSubSections.current?.items.map((opt) => renderCard(opt))}
        </div>
      );
    }

    return (
      <div className={styles.cardGrid} role="listbox">
        {activeGroup.options.map((opt) => renderCard(opt))}
      </div>
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.searchRow}>
        <input
          ref={searchInputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {!searchResults && nonEmptyGroups.length > 1 && (
        <div className={styles.tabRow} role="tablist">
          {nonEmptyGroups.map((group) => (
            <button
              key={group.label}
              type="button"
              role="tab"
              aria-selected={activeTab === group.label}
              className={`${styles.tab} ${activeTab === group.label ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(group.label)}
            >
              {group.label}
            </button>
          ))}
        </div>
      )}

      {adminSubSections && (
        <div className={styles.subTabRow} role="tablist">
          {adminSubSections.visible.map((section) => (
            <button
              key={section.label}
              type="button"
              role="tab"
              aria-selected={adminSubSections.current?.label === section.label}
              className={`${styles.subTab} ${adminSubSections.current?.label === section.label ? styles.subTabActive : ''}`}
              onClick={() => setActiveAdminSub(section.label)}
            >
              {section.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.body}>{renderBody()}</div>
    </div>
  );
}
