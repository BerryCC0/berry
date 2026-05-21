"use client";

/**
 * MyNames — list ENS names owned by the connected wallet.
 *
 * Sourced from /api/ens/names-for-address (our Ponder indexer). Captures
 * .eth 2LDs (ERC-721), wrapped names (ERC-1155), and Registry-level
 * ownership (DNS imports, subnames).
 *
 * Supports a bulk-select mode for batch operations (renew today; transfer
 * once TransferModal exists in P4).
 */

import { useMemo, useState } from "react";
import { useWallet } from "@/OS/hooks/useWallet";
import { useENS } from "@/OS/hooks/useENS";
import {
  useMyEnsNames,
  useEnsBulkPrice,
  useRenewEnsName,
  useEnsInvalidate,
  type MyEnsName,
} from "@/app/lib/ens/hooks";
import {
  NameListItem,
  NameListSkeleton,
  EmptyState,
  ErrorState,
  BulkActionBar,
  type BulkAction,
} from "../components";
import styles from "./MyNames.module.css";

interface MyNamesProps {
  onSelect: (name: string) => void;
  /** Optional — invoked when the user clicks the "Register" CTA in empty state. */
  onRegister?: () => void;
}

const ONE_YEAR = 365 * 24 * 60 * 60;

function isEthSecondLevel(name: MyEnsName): boolean {
  if (!name.name) return false;
  if (!name.name.endsWith(".eth")) return false;
  return (name.name.match(/\./g) ?? []).length === 1;
}

function sortNames(names: MyEnsName[], primaryName: string | null): MyEnsName[] {
  return [...names].sort((a, b) => {
    if (primaryName) {
      if (a.name === primaryName) return -1;
      if (b.name === primaryName) return 1;
    }
    const ae = a.expiry ? Number(a.expiry) : Number.MAX_SAFE_INTEGER;
    const be = b.expiry ? Number(b.expiry) : Number.MAX_SAFE_INTEGER;
    if (ae !== be) return ae - be;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

export function MyNames({ onSelect, onRegister }: MyNamesProps) {
  const { address, isConnected, connect } = useWallet();
  const { name: primaryName } = useENS(address);
  const { data, isLoading, error, refetch } = useMyEnsNames(address);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => (data ? sortNames(data, primaryName) : []), [data, primaryName]);

  const selectedNames = useMemo(
    () => sorted.filter((n) => n.name && selected.has(n.node)),
    [sorted, selected],
  );

  const renewableSelected = useMemo(
    () => selectedNames.filter(isEthSecondLevel).map((n) => n.name!),
    [selectedNames],
  );

  // Price preview for the currently selected renewable names
  const bulkPrice = useEnsBulkPrice(
    renewableSelected.length > 0 ? renewableSelected : undefined,
    ONE_YEAR,
  );

  const renewer = useRenewEnsName();
  const invalidate = useEnsInvalidate();

  const enterSelect = () => {
    setSelectMode(true);
    setSelected(new Set());
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (node: string, isOn: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isOn) next.add(node);
      else next.delete(node);
      return next;
    });
  };

  const handleBulkRenew = async () => {
    if (!bulkPrice.data || renewableSelected.length === 0) return;
    await renewer.renew({
      nameOrNames: renewableSelected,
      duration: ONE_YEAR,
      value: bulkPrice.data.total,
    });
    invalidate.address(address!);
    cancelSelect();
  };

  // Disconnected / loading / error / empty branches
  if (!isConnected) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon="🔌"
          title="Connect a wallet"
          description="See and manage the ENS names you own."
          cta={{ label: "Connect wallet", onClick: connect }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <NameListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon="✦"
          title="No ENS names yet"
          description="Register a .eth name or import a DNS domain to get started."
          cta={onRegister ? { label: "Register .eth", onClick: onRegister } : undefined}
        />
      </div>
    );
  }

  const allEligibleForRenew = selectedNames.every(isEthSecondLevel);

  const actions: BulkAction[] = [
    {
      label: renewer.isPending
        ? "Confirm in wallet…"
        : bulkPrice.data
          ? `Renew (${(Number(bulkPrice.data.total) / 1e18).toFixed(4)} ETH)`
          : "Renew",
      onClick: handleBulkRenew,
      enabled:
        renewableSelected.length > 0 &&
        allEligibleForRenew &&
        !!bulkPrice.data &&
        !renewer.isPending,
      disabledReason: !allEligibleForRenew
        ? "Only .eth names can be renewed"
        : renewableSelected.length === 0
          ? "Select at least one .eth name"
          : "Loading price…",
      variant: "primary",
    },
    {
      label: "Transfer",
      onClick: () => {
        // TransferModal lands in P4; until then this is a no-op stub.
      },
      enabled: false,
      disabledReason: "Transfer modal lands in P4",
    },
  ];

  return (
    <div className={styles.container}>
      {selectMode ? (
        <BulkActionBar count={selected.size} onCancel={cancelSelect} actions={actions} />
      ) : (
        <div className={styles.headerRow}>
          <span className={styles.title}>My Names</span>
          <button type="button" className={styles.selectButton} onClick={enterSelect}>
            Select
          </button>
        </div>
      )}

      <ul className={styles.list}>
        {sorted.map((n) => {
          const renewableEligible = isEthSecondLevel(n);
          return (
            <NameListItem
              key={n.node}
              name={n}
              isPrimary={!!primaryName && primaryName === n.name}
              selectMode={selectMode}
              selected={selected.has(n.node)}
              selectionDisabled={selectMode && !renewableEligible}
              selectionDisabledReason="Not eligible for current bulk action"
              onClick={() => n.name && onSelect(n.name)}
              onSelectChange={(on) => toggleSelect(n.node, on)}
            />
          );
        })}
      </ul>

      {renewer.error && <div className={styles.error}>Error: {renewer.error.message}</div>}
    </div>
  );
}
