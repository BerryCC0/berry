"use client";

/**
 * The button that swaps between Wallet and Names surfaces.
 * Lives in the IdentityShell header.
 */

import { useSurfaceSwap } from "./useSurfaceSwap";
import styles from "./SurfaceToggle.module.css";

interface SurfaceToggleProps {
  windowId: string;
  toAppId: string;
  label: string;
}

export function SurfaceToggle({ windowId, toAppId, label }: SurfaceToggleProps) {
  const { swap } = useSurfaceSwap(windowId, toAppId);

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={swap}
      aria-label={`Switch to ${label}`}
    >
      {label} →
    </button>
  );
}
