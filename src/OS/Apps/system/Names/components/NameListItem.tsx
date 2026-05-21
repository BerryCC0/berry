"use client";

/**
 * NameListItem — single row in the MyNames list.
 *
 * Renders avatar dot + name + secondary line (expiry / type / "primary").
 * Trailing affordance flips between a chevron (default mode) and a
 * checkbox (bulk-select mode).
 */

import { AvatarBubble } from "@/OS/Apps/system/_identity/components";
import type { MyEnsName } from "@/app/lib/ens/hooks";
import { ExpiryPill } from "./ExpiryPill";
import styles from "./NameListItem.module.css";

interface NameListItemProps {
  name: MyEnsName;
  /** True when this name resolves as the connected wallet's primary. */
  isPrimary?: boolean;
  /** Show checkbox instead of chevron. */
  selectMode?: boolean;
  /** Bulk-select checked state. */
  selected?: boolean;
  /** Force-disable selection — e.g. DNS imports cannot be bulk-renewed. */
  selectionDisabled?: boolean;
  selectionDisabledReason?: string;
  onClick?: () => void;
  onSelectChange?: (selected: boolean) => void;
}

function deriveSecondaryLine(name: MyEnsName): string {
  if (name.isWrapped) return "wrapped";
  if (name.name && !name.name.endsWith(".eth")) {
    // Could be DNS-imported or a subname
    const dotCount = (name.name.match(/\./g) ?? []).length;
    return dotCount > 1 ? "subname" : "DNS · imported";
  }
  if (name.parent && name.name) {
    const dotCount = (name.name.match(/\./g) ?? []).length;
    if (dotCount > 1) return "subname";
  }
  return ".eth";
}

export function NameListItem({
  name,
  isPrimary = false,
  selectMode = false,
  selected = false,
  selectionDisabled = false,
  selectionDisabledReason,
  onClick,
  onSelectChange,
}: NameListItemProps) {
  const displayName = name.name ?? `(unnamed)`;
  const secondary = deriveSecondaryLine(name);

  const handleRowClick = () => {
    if (selectMode) {
      if (!selectionDisabled) onSelectChange?.(!selected);
    } else {
      onClick?.();
    }
  };

  return (
    <li className={styles.item}>
      <button
        type="button"
        className={styles.row}
        onClick={handleRowClick}
        disabled={selectMode && selectionDisabled}
        title={selectMode && selectionDisabled ? selectionDisabledReason : undefined}
      >
        <AvatarBubble address={name.owner ?? name.registrant ?? name.wrappedOwner ?? "0x00"} size={32} />
        <div className={styles.identity}>
          <div className={styles.primary}>
            <span className={styles.name}>{displayName}</span>
            {isPrimary && <span className={styles.primaryBadge}>★ primary</span>}
          </div>
          <div className={styles.secondary}>
            <span className={styles.kind}>{secondary}</span>
            {name.expiry && <ExpiryPill expiry={name.expiry} />}
          </div>
        </div>
        {selectMode ? (
          <span
            className={`${styles.checkbox} ${selected ? styles.checked : ""} ${selectionDisabled ? styles.checkboxDisabled : ""}`}
            aria-hidden
          >
            {selected ? "☑" : "☐"}
          </span>
        ) : (
          <span className={styles.chevron} aria-hidden>›</span>
        )}
      </button>
    </li>
  );
}
