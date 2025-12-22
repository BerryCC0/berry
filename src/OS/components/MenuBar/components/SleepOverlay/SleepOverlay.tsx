"use client";

/**
 * Sleep Overlay Component
 * Full-screen dark overlay when the system is in sleep mode.
 * Click or press any key to wake.
 */

import { useEffect, useCallback } from "react";
import styles from "./SleepOverlay.module.css";
import { getIcon } from "@/OS/lib/IconRegistry";

interface SleepOverlayProps {
  onWake: () => void;
}

export function SleepOverlay({ onWake }: SleepOverlayProps) {
  const handleWake = useCallback(() => {
    onWake();
  }, [onWake]);

  // Wake on any key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      handleWake();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleWake]);

  return (
    <div 
      className={styles.overlay} 
      onClick={handleWake}
      role="button"
      tabIndex={0}
      aria-label="Click or press any key to wake"
    >
      <div className={styles.content}>
      <img
          src={getIcon("berry")}
          alt="Berry OS"
          className={styles.icon}
        />
        <p className={styles.hint}>Click or press any key to wake</p>
      </div>
    </div>
  );
}

