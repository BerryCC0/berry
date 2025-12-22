"use client";

/**
 * BootOverlay Component
 * Displays during OS boot and data loading to provide a smooth startup experience.
 * Stays visible until the OS is fully ready (isReady from bootStore).
 */

import { useEffect, useState } from "react";
import { getIcon } from "@/OS/lib/IconRegistry";
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

  // Determine status text based on current boot phase
  let statusText = "Starting Berry OS...";
  if (!isBooting && isWaitingForWallet) {
    statusText = "Checking session...";
  } else if (!isBooting && isLoadingData) {
    statusText = "Loading your settings...";
  } else if (!isBooting && !isWaitingForWallet && !isLoadingData && !isReady) {
    statusText = "Preparing desktop...";
  }

  return (
    <div className={`${styles.overlay} ${fadeOut ? styles.fadeOut : ""}`}>
      <div className={styles.content}>
        {/* Berry Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getIcon("berry")}
          alt="Berry OS"
          className={styles.logo}
        />

        {/* Berry OS Title */}
        <h1 className={styles.title}>Berry OS</h1>

        {/* Loading Spinner */}
        <div className={styles.spinner}>
          <div className={styles.spinnerDot}></div>
          <div className={styles.spinnerDot}></div>
          <div className={styles.spinnerDot}></div>
        </div>

        {/* Status Text */}
        <p className={styles.status}>{statusText}</p>
      </div>

      {/* Retro scan lines effect */}
      <div className={styles.scanlines}></div>
    </div>
  );
}

