"use client";

/**
 * Crystal Ball App
 * Shows what the next Noun would look like if minted at the current block
 */

import type { AppComponentProps } from "@/OS/types/app";
import { NounImage } from "@/app/lib/nouns/components";
import { getTraitName } from "@/app/lib/nouns/utils/trait-name-utils";
import { useCrystalBall } from "./hooks/useCrystalBall";
import styles from "./CrystalBall.module.css";

export function CrystalBall({}: AppComponentProps) {
  const { seed, nextNounId, blockNumber, isLoading } = useCrystalBall();

  return (
    <div className={styles.container}>
      {/* Noun Preview */}
      <div className={styles.imageSection}>
        {isLoading ? (
          <div className={styles.placeholder}>
            <span className={styles.crystal}>🔮</span>
          </div>
        ) : seed ? (
          <NounImage seed={seed} size={280} className={styles.nounImage} />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.crystal}>🔮</span>
          </div>
        )}
      </div>

      {/* Block Info */}
      <div className={styles.blockInfo}>
        <span className={styles.label}>Current Block</span>
        <span className={styles.value}>
          {isLoading ? "..." : blockNumber?.toString() || "—"}
        </span>
      </div>

      {/* Noun ID */}
      <div className={styles.blockInfo}>
        <span className={styles.label}>Next Noun</span>
        <span className={styles.value}>
          {isLoading ? "..." : nextNounId ? `Noun ${nextNounId}` : "—"}
        </span>
      </div>

      {/* Traits List */}
      <div className={styles.traitsList}>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Head</span>
          <span className={styles.traitValue}>
            {isLoading ? "..." : seed ? getTraitName("head", seed.head) : "—"}
          </span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Glasses</span>
          <span className={styles.traitValue}>
            {isLoading ? "..." : seed ? getTraitName("glasses", seed.glasses) : "—"}
          </span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Body</span>
          <span className={styles.traitValue}>
            {isLoading ? "..." : seed ? getTraitName("body", seed.body) : "—"}
          </span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Accessory</span>
          <span className={styles.traitValue}>
            {isLoading ? "..." : seed ? getTraitName("accessory", seed.accessory) : "—"}
          </span>
        </div>
        <div className={styles.traitItem}>
          <span className={styles.traitLabel}>Background</span>
          <span className={styles.traitValue}>
            {isLoading ? "..." : seed ? getTraitName("background", seed.background) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
