/**
 * EscrowedNounsPicker
 *
 * Shared picker UI for selecting Nouns currently held by the Fork Escrow
 * contract. Used by both withdraw-tokens (flat selection + recipient) and
 * return-tokens (selection scoped to one original depositor at a time).
 *
 * The selection mode is controlled by the parent via `mode`:
 *   • 'flat' — any escrowed Noun can be picked
 *   • 'by-owner' — proposer first picks an original depositor; then only
 *     that depositor's escrowed Nouns are selectable
 *
 * Selected token IDs are reported back as a comma-separated string so the
 * underlying action def's `tokenIds` field shape doesn't change.
 */

'use client';

import { useMemo } from 'react';
import { NounImageById } from '@/app/lib/nouns/components/NounImage';
import {
  useForkEscrowGroupedByOwner,
  useForkEscrowNouns,
  type EscrowedOwnerGroup,
} from '@/app/lib/nouns/hooks';
import type { EscrowedNoun } from '@/app/api/nouns/fork-escrow/route';
import { BerryLoader } from '../../../components/BerryLoader';
import styles from './EscrowedNounsPicker.module.css';

// ---------------------------------------------------------------------------
// Helpers — comma-separated id field <-> Set<number>
// ---------------------------------------------------------------------------

function parseSelectedIds(raw: string | undefined): Set<number> {
  if (!raw) return new Set();
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  return new Set(ids);
}

function stringifySelectedIds(ids: Set<number>): string {
  return Array.from(ids)
    .sort((a, b) => a - b)
    .join(', ');
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Shared state UI — loading / empty / error
// ---------------------------------------------------------------------------

function LoadingState({ label }: { label: string }) {
  return (
    <div className={styles.loadingState}>
      <BerryLoader />
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className={styles.emptyState}>{message}</div>;
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className={styles.errorState}>
      Failed to load fork escrow contents — {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flat picker — every escrowed Noun, multi-select
// ---------------------------------------------------------------------------

interface FlatPickerProps {
  selectedTokenIds: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

function FlatPicker({ selectedTokenIds, onChange, disabled }: FlatPickerProps) {
  const { data, isLoading, error } = useForkEscrowNouns();
  const selected = useMemo(
    () => parseSelectedIds(selectedTokenIds),
    [selectedTokenIds],
  );

  if (isLoading) return <LoadingState label="Loading escrowed Nouns…" />;
  if (error) return <ErrorState message={error.message} />;
  if (!data || data.nouns.length === 0) {
    return <EmptyState message="No Nouns are currently in fork escrow." />;
  }

  const toggle = (tokenId: number) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(tokenId)) next.delete(tokenId);
    else next.add(tokenId);
    onChange(stringifySelectedIds(next));
  };

  return (
    <div className={styles.container}>
      <div className={styles.statusBanner}>
        <span className={styles.statusLabel}>
          {data.totalEscrowed} Noun{data.totalEscrowed === 1 ? '' : 's'} in fork escrow
        </span>
        <span className={styles.statusCount}>{selected.size} selected</span>
      </div>
      <div className={styles.nounGrid}>
        {data.nouns.map((noun) => (
          <NounCard
            key={noun.tokenId}
            noun={noun}
            selected={selected.has(noun.tokenId)}
            disabled={disabled}
            onToggle={() => toggle(noun.tokenId)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// By-owner picker — pick a depositor, then pick from their escrowed Nouns
// ---------------------------------------------------------------------------

interface ByOwnerPickerProps {
  selectedOwner: string;
  selectedTokenIds: string;
  onChange: (next: { owner: string; tokenIds: string }) => void;
  disabled?: boolean;
}

function ByOwnerPicker({
  selectedOwner,
  selectedTokenIds,
  onChange,
  disabled,
}: ByOwnerPickerProps) {
  const { data, isLoading, error } = useForkEscrowGroupedByOwner();
  const selected = useMemo(
    () => parseSelectedIds(selectedTokenIds),
    [selectedTokenIds],
  );

  if (isLoading) return <LoadingState label="Loading escrowed Nouns…" />;
  if (error) return <ErrorState message={error.message} />;
  if (!data || data.length === 0) {
    return <EmptyState message="No Nouns are currently in fork escrow." />;
  }

  const activeGroup =
    data.find((g) => g.owner.toLowerCase() === selectedOwner.toLowerCase()) ??
    null;

  const selectOwner = (group: EscrowedOwnerGroup) => {
    if (disabled) return;
    // Switching owners clears the token selection since the IDs are
    // owner-scoped and shouldn't carry over.
    onChange({ owner: group.owner, tokenIds: '' });
  };

  const toggle = (tokenId: number) => {
    if (disabled || !activeGroup) return;
    const next = new Set(selected);
    if (next.has(tokenId)) next.delete(tokenId);
    else next.add(tokenId);
    onChange({
      owner: activeGroup.owner,
      tokenIds: stringifySelectedIds(next),
    });
  };

  const selectAll = () => {
    if (disabled || !activeGroup) return;
    onChange({
      owner: activeGroup.owner,
      tokenIds: stringifySelectedIds(
        new Set(activeGroup.nouns.map((n) => n.tokenId)),
      ),
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.stepLabel}>Step 1 — Original depositor</div>
      <div className={styles.ownerList}>
        {data.map((group) => (
          <OwnerRow
            key={group.owner}
            group={group}
            active={activeGroup?.owner === group.owner}
            disabled={disabled}
            onSelect={() => selectOwner(group)}
          />
        ))}
      </div>

      {activeGroup && (
        <>
          <div className={styles.stepHeader}>
            <div className={styles.stepLabel}>
              Step 2 — Nouns to return ({selected.size} of {activeGroup.nouns.length})
            </div>
            <button
              type="button"
              onClick={selectAll}
              disabled={disabled}
              className={styles.selectAllBtn}
            >
              Select all
            </button>
          </div>
          <div className={styles.ownerNounGrid}>
            {activeGroup.nouns.map((noun: EscrowedNoun) => (
              <NounCard
                key={noun.tokenId}
                noun={noun}
                selected={selected.has(noun.tokenId)}
                disabled={disabled}
                onToggle={() => toggle(noun.tokenId)}
                hideDepositor
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card primitives
// ---------------------------------------------------------------------------

interface NounCardProps {
  noun: EscrowedNoun;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
  /** When inside an owner-scoped grid, suppress the "from X" line. */
  hideDepositor?: boolean;
}

function NounCard({
  noun,
  selected,
  disabled,
  onToggle,
  hideDepositor,
}: NounCardProps) {
  const className = [
    styles.nounCard,
    selected ? styles.selected : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={className}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <input
        type="checkbox"
        className={styles.hiddenCheckbox}
        checked={selected}
        readOnly
        tabIndex={-1}
      />
      <div className={styles.nounImageWrap}>
        <NounImageById id={noun.tokenId} size={80} />
      </div>
      <div className={styles.nounMeta}>
        <span className={styles.nounId}>Noun #{noun.tokenId}</span>
        {!hideDepositor && (
          <span className={styles.depositorLabel}>
            from {noun.originalOwnerEns ?? truncateAddress(noun.originalOwner)}
          </span>
        )}
      </div>
    </div>
  );
}

interface OwnerRowProps {
  group: EscrowedOwnerGroup;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

function OwnerRow({ group, active, disabled, onSelect }: OwnerRowProps) {
  const className = [
    styles.ownerRow,
    active ? styles.active : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={className}>
      <input
        type="radio"
        name="fork-escrow-owner"
        className={styles.ownerRadio}
        checked={active}
        onChange={onSelect}
        disabled={disabled}
      />
      <span className={styles.ownerName}>
        {group.ens ? (
          <span className={styles.ensName}>{group.ens}</span>
        ) : (
          <span className={styles.rawAddress}>{truncateAddress(group.owner)}</span>
        )}
      </span>
      <span className={styles.ownerCount}>
        {group.nouns.length} Noun{group.nouns.length === 1 ? '' : 's'}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export type EscrowedNounsPickerProps =
  | ({ mode: 'flat' } & FlatPickerProps)
  | ({ mode: 'by-owner' } & ByOwnerPickerProps);

export function EscrowedNounsPicker(props: EscrowedNounsPickerProps) {
  if (props.mode === 'flat') {
    return (
      <FlatPicker
        selectedTokenIds={props.selectedTokenIds}
        onChange={props.onChange}
        disabled={props.disabled}
      />
    );
  }
  return (
    <ByOwnerPicker
      selectedOwner={props.selectedOwner}
      selectedTokenIds={props.selectedTokenIds}
      onChange={props.onChange}
      disabled={props.disabled}
    />
  );
}
