/**
 * Berry OS Boot Sequence
 * Central orchestrator for OS initialization.
 * 
 * Boot Flow:
 * 1. Register apps and event bus
 * 2. Wait for wallet session restoration
 * 3. If wallet connected → upgrade persistence → load all saved data
 * 4. Initialize stores with loaded data
 * 5. Apply settings to DOM
 * 6. Complete boot
 */

import { appLauncher } from "./AppLauncher";
import { osAppConfigs } from "@/OS/Apps/OSAppConfig";
import { initializeBridgeForwarding, systemBus } from "./EventBus";
import { enforceAllWindowBounds } from "./WindowManager";
import { persistence } from "./Persistence";
import { applyAppearance, applyAccessibility } from "./Settings";
import { useBootStore } from "@/OS/store/bootStore";
import { useDockStore } from "@/OS/store/dockStore";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { useDesktopStore } from "@/OS/store/desktopStore";
import { DEFAULT_SETTINGS } from "./Settings/defaults";
import type { SystemSettings } from "@/OS/types/settings";

let resizeCleanup: (() => void) | null = null;

// Track if we've already attempted to load persisted data
let persistedDataLoaded = false;

/**
 * Initialize Berry OS
 * Call this once on app mount
 */
export function bootBerryOS(): void {
  const bootStore = useBootStore.getState();

  // Already booted or currently booting
  if (bootStore.isBooted || bootStore.isBooting) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Boot] Berry OS already booted/booting, skipping");
    }
    return;
  }

  bootStore.startBoot();

  if (process.env.NODE_ENV === "development") {
    console.log("[Boot] Starting Berry OS...");
  }

  try {
    // 1. Register all OS apps
    registerOSApps();

    // 2. Set up event bus bridge forwarding
    initializeBridgeForwarding();

    // 3. Set up viewport resize listener
    setupViewportResizeListener();

    // 4. Initialize stores with defaults first (will be overwritten if data loads)
    initializeStoresWithDefaults();

    // 5. Apply default settings to DOM
    applySettingsToDOM(DEFAULT_SETTINGS);

    // Boot is "complete" - apps can render
    // Persisted data will load async when wallet connects
    bootStore.completeBoot();

    if (process.env.NODE_ENV === "development") {
      console.log("[Boot] Berry OS ready (defaults loaded)");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown boot error";
    bootStore.setBootError(message);
    console.error("[Boot] Boot failed:", message);
  }
}

/**
 * Load persisted data for a connected wallet
 * Called by useWallet hook when wallet connects/restores session
 */
export async function loadPersistedData(wallet: {
  address: string;
  chain: string;
  chainId: number;
}): Promise<void> {
  const bootStore = useBootStore.getState();

  // Prevent duplicate loads
  if (persistedDataLoaded) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Boot] Persisted data already loaded, skipping");
    }
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[Boot] Loading persisted data for wallet:", wallet.address.slice(0, 8) + "...");
  }

  // Mark that we're loading data (show overlay)
  bootStore.startLoadingData();

  try {
    // Upgrade persistence to use database
    const profile = await persistence.upgradeToWallet(wallet);

    if (process.env.NODE_ENV === "development") {
      console.log("[Boot] Persistence upgraded, profile:", profile.id);
    }

    // Load all user data at once
    const userData = await persistence.loadAllUserData();

    if (userData) {
      // Apply loaded data to stores
      if (userData.settings) {
        const settingsStore = useSettingsStore.getState();
        settingsStore.setSettings(userData.settings);
        applySettingsToDOM(userData.settings);
        if (process.env.NODE_ENV === "development") {
          console.log("[Boot] Settings loaded from database");
        }
      }

      if (userData.dockConfig) {
        const dockStore = useDockStore.getState();
        // Re-initialize dock with saved config
        if (userData.dockConfig.pinnedApps) {
          dockStore.initialize(userData.dockConfig.pinnedApps);
        }
        if (userData.dockConfig.iconSize) {
          dockStore.setIconSize(userData.dockConfig.iconSize);
        }
        if (process.env.NODE_ENV === "development") {
          console.log("[Boot] Dock config loaded from database");
        }
      }

      if (userData.desktopLayout && userData.desktopLayout.icons.length > 0) {
        const desktopStore = useDesktopStore.getState();
        // Fully restore desktop layout (icons + settings)
        desktopStore.restoreLayout(userData.desktopLayout);
        if (process.env.NODE_ENV === "development") {
          console.log("[Boot] Desktop layout loaded from database");
        }
      }
    }

    persistedDataLoaded = true;

    if (process.env.NODE_ENV === "development") {
      console.log("[Boot] All persisted data loaded successfully");
    }
  } catch (error) {
    console.error("[Boot] Failed to load persisted data:", error);
    // Continue with defaults - don't crash the OS
  } finally {
    // Always finish loading, even on error
    bootStore.finishLoadingData();
  }
}

/**
 * Clear persisted data flag (called on wallet disconnect)
 */
export function clearPersistedDataFlag(): void {
  persistedDataLoaded = false;
}

/**
 * Register all OS apps with the app launcher
 */
function registerOSApps(): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Boot] Registering ${osAppConfigs.length} OS apps`);
  }

  appLauncher.registerAll(osAppConfigs);

  // Emit event so components can refresh their app lists
  systemBus.emit("boot:apps-registered", { count: osAppConfigs.length });
}

/**
 * Initialize all stores with default values
 */
function initializeStoresWithDefaults(): void {
  const settingsStore = useSettingsStore.getState();
  const dockStore = useDockStore.getState();

  // Initialize settings with defaults
  settingsStore.initialize();

  // Initialize dock with defaults
  dockStore.initialize();

  if (process.env.NODE_ENV === "development") {
    console.log("[Boot] Stores initialized with defaults");
  }
}

/**
 * Apply settings to DOM (theme, accessibility, etc.)
 */
function applySettingsToDOM(settings: SystemSettings): void {
  applyAppearance(settings.appearance);
  applyAccessibility(settings.accessibility);
}

/**
 * Set up viewport resize listener to enforce window bounds
 */
function setupViewportResizeListener(): void {
  if (typeof window === "undefined") return;

  // Debounce resize handler
  let resizeTimeout: ReturnType<typeof setTimeout>;

  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      enforceAllWindowBounds();
    }, 100);
  };

  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  resizeCleanup = () => {
    clearTimeout(resizeTimeout);
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("orientationchange", handleResize);
  };
}

/**
 * Check if OS has been booted
 */
export function isOSBooted(): boolean {
  return useBootStore.getState().isBooted;
}

/**
 * Shutdown Berry OS (cleanup)
 */
export function shutdownBerryOS(): void {
  const bootStore = useBootStore.getState();

  if (!bootStore.isBooted) return;

  if (resizeCleanup) {
    resizeCleanup();
    resizeCleanup = null;
  }

  // Reset the persisted data flag
  persistedDataLoaded = false;

  bootStore.reset();

  if (process.env.NODE_ENV === "development") {
    console.log("[Boot] Berry OS shutdown");
  }
}

/**
 * Reset boot state (for testing)
 */
export function resetBoot(): void {
  shutdownBerryOS();
}
