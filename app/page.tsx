"use client";

/**
 * Berry OS - Main Desktop Page
 * 
 * Boot sequence is managed by useBootSequence hook which:
 * 1. Waits for core boot (app registration, store setup)
 * 2. Waits for wallet SDK to determine connection state
 * 3. Loads persisted data if wallet is connected
 * 4. Applies settings and marks ready
 */

import { useEffect } from "react";
import { Desktop } from "@/OS/Shell/Desktop";
import { MenuBar } from "@/OS/Shell/MenuBar";
import { Dock } from "@/OS/Shell/Dock";
import { WindowManager } from "@/OS/Shell/WindowManager";
import { BootOverlay } from "@/OS/Shell/Boot";
import { Launchpad } from "@/OS/Shell/Launchpad";
import { SnapPreview } from "@/OS/Shell/Window/components/SnapPreview";
import { CommandPalette } from "@/OS/Shell/CommandPalette";
import { StageStrip } from "@/OS/Shell/StageStrip";
import { Expose } from "@/OS/Shell/Expose";
import { SleepOverlay } from "@/OS/Shell/Boot/SleepOverlay";
import { ShutdownOverlay } from "@/OS/Shell/Boot/ShutdownOverlay";
import { NounsIconProvider } from "@/OS/Shell/NounsIconProvider";
import { bootBerryOS, shutdownBerryOS } from "@/OS/lib/Boot";
import { usePersistence, useApplySettings, useBootSequence, useRouteSync, useKeyboardShortcuts } from "@/OS/hooks";
import { useBootStore } from "@/OS/store/bootStore";

export default function Home() {
  const isSleeping = useBootStore((state) => state.isSleeping);
  const isShutdown = useBootStore((state) => state.isShutdown);
  const wake = useBootStore((state) => state.wake);

  // Boot the OS on mount - initializes core systems
  useEffect(() => {
    bootBerryOS();
    return () => shutdownBerryOS();
  }, []);

  // Orchestrate the full boot sequence (waits for wallet, loads data, applies settings)
  const { isBooting, isWaitingForWallet, isLoadingData, isReady } = useBootSequence();

  // Enable auto-save for dock, settings, and desktop when wallet is connected
  usePersistence();

  // Apply live settings changes after boot is complete
  useApplySettings();

  // Sync URL with window state for deep linking
  useRouteSync();

  // OS + per-app keyboard shortcuts (desktop)
  useKeyboardShortcuts();

  return (
    <>
      {/* Boot overlay - shows until OS is fully ready */}
      <BootOverlay 
        isBooting={isBooting} 
        isWaitingForWallet={isWaitingForWallet}
        isLoadingData={isLoadingData} 
        isReady={isReady}
      />
      
      <MenuBar />
      <Desktop />
      <WindowManager />
      <SnapPreview />
      <Dock />
      <Launchpad />
      <CommandPalette />
      <StageStrip />
      <Expose />
      {isReady && <NounsIconProvider />}
      {isSleeping && <SleepOverlay onWake={wake} />}
      {isShutdown && <ShutdownOverlay />}
    </>
  );
}
