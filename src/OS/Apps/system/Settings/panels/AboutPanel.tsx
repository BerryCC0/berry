"use client";

/**
 * About Panel
 */

import { getIcon } from "@/OS/lib/IconRegistry";
import { useWallet } from "@/OS/hooks";
import { persistence } from "@/OS/lib/Persistence";
import styles from "./Panel.module.css";

export function AboutPanel() {
  const { isConnected, address, chainName } = useWallet();

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>About Berry OS</h2>

      <div className={styles.aboutContainer}>
        <div className={styles.logoSection}>
          <img
            src={getIcon("berry")}
            alt="Berry OS"
            className={styles.logo}
          />
          <h3 className={styles.productName}>Berry OS</h3>
          <p className={styles.version}>Version 0.1.0 (Alpha)</p>
        </div>

        <div className={styles.descriptionSection}>
          <p>
            A Mac OS 8 recreation for the modern web, built for the Nouns
            ecosystem.
          </p>
          <p className={styles.subtext}>
            Berry OS brings the classic Macintosh experience to your browser,
            with Web3 integration for persistent settings across devices.
          </p>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Platform</span>
            <span className={styles.infoValue}>Web</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Persistence</span>
            <span className={styles.infoValue}>
              {persistence.isPersistent() ? "Neon Database" : "In-Memory (Ephemeral)"}
            </span>
          </div>
          {isConnected && (
            <>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Wallet</span>
                <span className={styles.infoValue}>
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Network</span>
                <span className={styles.infoValue}>{chainName}</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.credits}>
          <p>© 2024 Berry OS Contributors</p>
          <p className={styles.links}>
            <a href="https://nouns.wtf" target="_blank" rel="noopener noreferrer">
              Nouns DAO
            </a>
            {" · "}
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

