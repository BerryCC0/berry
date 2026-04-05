"use client";

/**
 * AboutPopover Component
 * Shows Berry OS version info in a centered modal/popover.
 * Replaces the old AboutPanel that consumed a full settings panel.
 */

import { useEffect, useRef } from "react";
import { getIcon } from "@/OS/lib/IconRegistry";
import styles from "./AboutPopover.module.css";

interface AboutPopoverProps {
  onClose: () => void;
}

export function AboutPopover({ onClose }: AboutPopoverProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.popover} role="dialog" aria-label="About Berry OS">
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className={styles.logoSection}>
          <img
            src={getIcon("berry")}
            alt="Berry OS"
            className={styles.logo}
          />
          <h2 className={styles.productName}>Berry OS</h2>
          <p className={styles.version}>Version 0.1.0</p>
        </div>

        <div className={styles.description}>
          <p>
            A nostalgic desktop environment for the web, powered by Nouns DAO.
            Experience computing history from Platinum (1997) to Liquid Glass (2025).
          </p>
        </div>

        <div className={styles.info}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Platform</span>
            <span className={styles.infoValue}>Web</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Persistence</span>
            <span className={styles.infoValue}>Local + Wallet</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>License</span>
            <span className={styles.infoValue}>CC0 (Public Domain)</span>
          </div>
        </div>

        <div className={styles.credits}>
          <p>
            Built with ⌐◨-◨ by the Nouns community.
          </p>
        </div>
      </div>
    </div>
  );
}
