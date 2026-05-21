"use client";

/**
 * Render the 8 user-settable NameWrapper fuses as a checklist.
 * Already-burned fuses are pinned checked + disabled.
 * PARENT_CANNOT_CONTROL appears at the bottom as read-only context.
 */

import { useState } from "react";
import {
  useSetFuses,
  useEnsInvalidate,
  type FuseName,
} from "@/app/lib/ens/hooks";
import { WarningBanner } from "./WarningBanner";
import styles from "./FuseChecklist.module.css";

// Raw fuse bit values. Lifted from @ensdomains/ensjs/utils so we can
// check burned state with a simple bitmask — avoids the discriminated
// nested type that decodeFuses returns.
const FUSE_BITS: Record<FuseName, number> = {
  CANNOT_UNWRAP: 1,
  CANNOT_BURN_FUSES: 2,
  CANNOT_TRANSFER: 4,
  CANNOT_SET_RESOLVER: 8,
  CANNOT_SET_TTL: 16,
  CANNOT_CREATE_SUBDOMAIN: 32,
  CANNOT_APPROVE: 64,
  PARENT_CANNOT_CONTROL: 65536,
};

interface FuseChecklistProps {
  name: string;
  /** Current fuses bitfield from the NameWrapper. */
  fuses: number;
}

interface FuseDef {
  key: FuseName;
  label: string;
  description: string;
}

const USER_FUSES: FuseDef[] = [
  { key: "CANNOT_UNWRAP", label: "Cannot unwrap", description: "Permanently locks the name in the NameWrapper. Required before burning most other fuses." },
  { key: "CANNOT_TRANSFER", label: "Cannot transfer", description: "Prevents the name from being transferred to another owner." },
  { key: "CANNOT_SET_RESOLVER", label: "Cannot set resolver", description: "Locks the current resolver pointer; new records cannot reroute." },
  { key: "CANNOT_SET_TTL", label: "Cannot set TTL", description: "Locks the current TTL value." },
  { key: "CANNOT_CREATE_SUBDOMAIN", label: "Cannot create subdomain", description: "No new subnames can be created under this name." },
  { key: "CANNOT_APPROVE", label: "Cannot approve", description: "Disables ERC-1155 approval setting." },
  { key: "CANNOT_BURN_FUSES", label: "Cannot burn fuses", description: "Prevents any further fuse changes — the final lockdown." },
];

const PARENT_FUSE_LABEL = "Parent cannot control";

function isFuseBurned(bitfield: number, key: FuseName): boolean {
  return (bitfield & FUSE_BITS[key]) !== 0;
}

export function FuseChecklist({ name, fuses }: FuseChecklistProps) {
  const burner = useSetFuses();
  const invalidate = useEnsInvalidate();

  const [pending, setPending] = useState<Set<FuseName>>(new Set());

  const togglePending = (key: FuseName) => {
    setPending((p) => {
      const next = new Set(p);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleBurn = async () => {
    if (pending.size === 0) return;
    await burner.setFuses({
      name,
      fuses: Array.from(pending),
    });
    invalidate.name(name);
    setPending(new Set());
  };

  return (
    <div className={styles.container}>
      <WarningBanner tone="danger">
        Burning fuses is <strong>permanent</strong>. Once burned, the action is blocked on
        this name forever. Read each description before checking.
      </WarningBanner>

      <ul className={styles.list}>
        {USER_FUSES.map((fuse) => {
          const burned = isFuseBurned(fuses, fuse.key);
          const checked = burned || pending.has(fuse.key);
          return (
            <li key={fuse.key} className={styles.item}>
              <label className={`${styles.row} ${burned ? styles.burned : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={burned}
                  onChange={() => togglePending(fuse.key)}
                />
                <div className={styles.text}>
                  <span className={styles.label}>{fuse.label}</span>
                  <span className={styles.description}>{fuse.description}</span>
                </div>
                {burned && <span className={styles.burnedTag}>burned</span>}
              </label>
            </li>
          );
        })}

        {/* Parent-set fuse — read-only */}
        <li className={styles.item}>
          <div className={`${styles.row} ${styles.parentRow}`}>
            <input
              type="checkbox"
              checked={isFuseBurned(fuses, "PARENT_CANNOT_CONTROL")}
              disabled
              readOnly
            />
            <div className={styles.text}>
              <span className={styles.label}>{PARENT_FUSE_LABEL}</span>
              <span className={styles.description}>
                Set by the parent owner. Read-only from here.
              </span>
            </div>
          </div>
        </li>
      </ul>

      <button
        type="button"
        className={styles.burnButton}
        onClick={handleBurn}
        disabled={pending.size === 0 || burner.isPending}
      >
        {burner.isPending
          ? "Confirm in wallet…"
          : pending.size === 0
            ? "Select fuses to burn"
            : `Burn ${pending.size} fuse${pending.size === 1 ? "" : "s"}`}
      </button>

      {burner.error && <div className={styles.error}>Error: {burner.error.message}</div>}
    </div>
  );
}

