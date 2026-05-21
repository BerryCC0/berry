"use client";

/**
 * Single row in the Subnames RecordSection.
 * Shows the subname + a chevron to navigate, plus a small delete affordance.
 */

import { useState } from "react";
import type { EnsDomain } from "@/app/lib/ens/hooks";
import { useDeleteSubname, useEnsInvalidate } from "@/app/lib/ens/hooks";
import styles from "./SubnameRow.module.css";

interface SubnameRowProps {
  subname: EnsDomain;
  parentName: string;
  parentIsWrapped: boolean;
  onOpen: (name: string) => void;
}

export function SubnameRow({ subname, parentName, parentIsWrapped, onOpen }: SubnameRowProps) {
  const [confirming, setConfirming] = useState(false);
  const remover = useDeleteSubname();
  const invalidate = useEnsInvalidate();

  const handleDelete = async () => {
    if (!subname.name) return;
    await remover.remove({
      name: subname.name,
      contract: parentIsWrapped ? "nameWrapper" : "registry",
    });
    invalidate.name(parentName);
    setConfirming(false);
  };

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.main}
        onClick={() => subname.name && onOpen(subname.name)}
        disabled={!subname.name}
      >
        <span className={styles.name}>{subname.name ?? "(unnamed)"}</span>
        {subname.isWrapped && <span className={styles.tag}>wrapped</span>}
        <span className={styles.chevron} aria-hidden>›</span>
      </button>
      {confirming ? (
        <div className={styles.confirm}>
          <span className={styles.confirmText}>Delete?</span>
          <button type="button" className={styles.smallBtn} onClick={() => setConfirming(false)}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.smallBtn} ${styles.danger}`}
            onClick={handleDelete}
            disabled={remover.isPending}
          >
            {remover.isPending ? "…" : "Delete"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.overflow}
          onClick={() => setConfirming(true)}
          aria-label="Delete subname"
        >
          ⋯
        </button>
      )}
    </div>
  );
}
