"use client";

/**
 * BootOverlay Component
 * Displays during OS boot and data loading to provide a smooth startup experience.
 * Stays visible until the OS is fully ready (isReady from bootStore).
 */

import { useEffect, useState } from "react";
import styles from "./BootOverlay.module.css";

interface BootOverlayProps {
  isBooting: boolean;
  isWaitingForWallet: boolean;
  isLoadingData: boolean;
  isReady: boolean;
}

export function BootOverlay({ 
  isBooting, 
  isWaitingForWallet, 
  isLoadingData, 
  isReady 
}: BootOverlayProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isReady) {
      // Small delay for visual polish
      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, 50);

      // Remove from DOM after fade animation
      const hideTimer = setTimeout(() => {
        setHidden(true);
      }, 550); // Match animation duration

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [isReady]);

  // Don't render if hidden
  if (hidden) {
    return null;
  }

  return (
    <div className={`${styles.overlay} ${fadeOut ? styles.fadeOut : ""}`}>
      {/* Berry Glyph GIF - centered */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/loader.gif"
        alt="Berry OS"
        className={styles.glyph}
      />
    </div>
  );
}

