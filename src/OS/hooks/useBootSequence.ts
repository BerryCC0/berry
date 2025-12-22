"use client";

/**
 * useBootSequence Hook
 * 
 * Orchestrates the Berry OS boot sequence:
 * 1. Wait for core boot to complete
 * 2. Wait for AppKit to determine wallet connection state
 * 3. If wallet connected, load persisted data
 * 4. Apply settings to DOM
 * 5. Mark OS as ready
 */

import { useEffect, useRef } from "react";
import { useAppKitState, useAppKitAccount } from "@reown/appkit/react";
import { useBootStore } from "@/OS/store/bootStore";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { loadPersistedData } from "@/OS/lib/Boot";
import { applyAppearance, applyAccessibility } from "@/OS/lib/Settings";

export function useBootSequence() {
  const { initialized: appKitInitialized } = useAppKitState();
  const { isConnected, address } = useAppKitAccount();
  
  const isBooted = useBootStore((state) => state.isBooted);
  const isWaitingForWallet = useBootStore((state) => state.isWaitingForWallet);
  const isLoadingData = useBootStore((state) => state.isLoadingData);
  const isReady = useBootStore((state) => state.isReady);
  const walletCheckComplete = useBootStore((state) => state.walletCheckComplete);
  const markReady = useBootStore((state) => state.markReady);
  
  const settings = useSettingsStore((state) => state.settings);
  const isSettingsInitialized = useSettingsStore((state) => state.isInitialized);
  
  // Track if we've already processed the boot sequence
  const bootSequenceRan = useRef(false);
  const dataLoadTriggered = useRef(false);

  // Phase 2: Wait for AppKit to initialize
  useEffect(() => {
    if (!isBooted || !isWaitingForWallet) return;
    
    // AppKit has finished initializing - we now know the wallet state
    if (appKitInitialized) {
      if (process.env.NODE_ENV === "development") {
        console.log("[useBootSequence] AppKit initialized, wallet connected:", isConnected);
      }
      walletCheckComplete();
    }
  }, [isBooted, isWaitingForWallet, appKitInitialized, isConnected, walletCheckComplete]);

  // Phase 3: If wallet connected, trigger data load
  useEffect(() => {
    if (bootSequenceRan.current) return;
    if (isWaitingForWallet) return; // Still waiting for wallet check
    if (!isBooted) return;
    
    // Wallet check is complete
    if (isConnected && address && !dataLoadTriggered.current) {
      // Wallet is connected - load persisted data
      dataLoadTriggered.current = true;
      if (process.env.NODE_ENV === "development") {
        console.log("[useBootSequence] Wallet connected, loading persisted data...");
      }
      // loadPersistedData is called by useWallet hook, we just wait for it
    } else if (!isConnected && !isLoadingData) {
      // No wallet - proceed with defaults
      if (process.env.NODE_ENV === "development") {
        console.log("[useBootSequence] No wallet, using defaults");
      }
      bootSequenceRan.current = true;
      applySettingsAndFinish();
    }
  }, [isBooted, isWaitingForWallet, isConnected, address, isLoadingData]);

  // Phase 4: After data loading completes, apply settings and mark ready
  useEffect(() => {
    if (bootSequenceRan.current) return;
    if (isLoadingData) return; // Still loading
    if (isWaitingForWallet) return; // Still waiting for wallet check
    if (!dataLoadTriggered.current && isConnected) return; // Data load hasn't been triggered yet
    
    // Data loading finished (or wasn't needed)
    if (isSettingsInitialized && !isLoadingData && dataLoadTriggered.current) {
      if (process.env.NODE_ENV === "development") {
        console.log("[useBootSequence] Data loaded, applying settings");
      }
      bootSequenceRan.current = true;
      applySettingsAndFinish();
    }
  }, [isSettingsInitialized, isLoadingData, isWaitingForWallet, isConnected]);

  // Helper to apply settings and mark ready
  function applySettingsAndFinish() {
    // Apply current settings to DOM
    applyAppearance(settings.appearance);
    applyAccessibility(settings.accessibility);
    
    // Use requestAnimationFrame to ensure DOM has painted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        markReady();
        if (process.env.NODE_ENV === "development") {
          console.log("[useBootSequence] Boot sequence complete, OS ready");
        }
      });
    });
  }

  // Get isBooting for the overlay
  const isBooting = useBootStore((state) => state.isBooting);

  return {
    isBooting,
    isWaitingForWallet,
    isLoadingData,
    isReady,
  };
}

