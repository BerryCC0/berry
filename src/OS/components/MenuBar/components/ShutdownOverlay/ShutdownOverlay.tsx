"use client";

/**
 * Shutdown Overlay Component
 * Shows when the system is shut down and window.close() doesn't work.
 */

import { useEffect, useState } from "react";
import styles from "./ShutdownOverlay.module.css";
import { getIcon } from "@/OS/lib/IconRegistry";

export function ShutdownOverlay() {
  const [phase, setPhase] = useState<"shutting-down" | "complete">("shutting-down");

  useEffect(() => {
    // Show "shutting down" for 2 seconds, then show final message
    const timer = setTimeout(() => {
      setPhase("complete");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {phase === "shutting-down" ? (
          <>
            <div className={styles.spinner} />
            <p className={styles.message}>Shutting down...</p>
          </>
        ) : (
          <>
        <img
          src={getIcon("berry")}
          alt="Berry OS"
          className={styles.icon}
        />
            <p className={styles.message}>It is now safe to close this tab.</p>
            <p className={styles.hint}>Press ⌘W or Ctrl+W to close</p>
          </>
        )}
      </div>
    </div>
  );
}

