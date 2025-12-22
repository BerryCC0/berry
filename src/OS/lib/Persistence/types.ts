/**
 * Persistence Types
 * Type definitions for the persistence layer
 */

import type { Theme } from "@/OS/types/theme";
import type { SystemSettings } from "@/OS/types/settings";
import type { PinnedApp } from "@/OS/store/dockStore";

/**
 * Wallet information for profile identification
 */
export interface WalletInfo {
  address: string;
  chain: string;
  chainId: number;
  linkedAt: number;
  label?: string;
}

/**
 * User profile - collection of all user data
 */
export interface UserProfile {
  id: string;
  primaryWallet: WalletInfo;
  linkedWallets: WalletInfo[];
  createdAt: number;
  lastActiveAt: number;
}

/**
 * Desktop icon position
 */
export interface DesktopIconState {
  id: string;
  appId: string;
  label: string;
  icon: string;
  x: number;
  y: number;
}

/**
 * Desktop layout configuration
 */
export interface DesktopLayout {
  icons: DesktopIconState[];
  gridSize: number;
  snapToGrid: boolean;
}

/**
 * Dock configuration
 */
export interface DockConfig {
  pinnedApps: PinnedApp[];
  iconSize: number;
}

/**
 * Window state for persistence
 */
export interface PersistedWindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  zIndex: number;
  appState?: unknown;
}

/**
 * All user data bundled together
 */
export interface UserData {
  theme: Theme | null;
  settings: SystemSettings | null;
  desktopLayout: DesktopLayout | null;
  windowState: PersistedWindowState[];
  dockConfig: DockConfig | null;
  appStates: Record<string, unknown>;
}

/**
 * Persistence adapter interface
 * Both InMemory and Neon adapters implement this
 */
export interface PersistenceAdapter {
  // Profile management
  getProfileByWallet(address: string, chain: string): Promise<UserProfile | null>;
  createProfile(wallet: Omit<WalletInfo, "linkedAt">): Promise<UserProfile>;
  linkWallet(profileId: string, wallet: Omit<WalletInfo, "linkedAt">): Promise<void>;
  unlinkWallet(profileId: string, address: string, chain: string): Promise<void>;
  setPrimaryWallet(profileId: string, address: string, chain: string): Promise<void>;
  updateLastActive(profileId: string): Promise<void>;

  // Theme
  saveTheme(profileId: string, theme: Theme): Promise<void>;
  loadTheme(profileId: string): Promise<Theme | null>;

  // Settings
  saveSettings(profileId: string, settings: SystemSettings): Promise<void>;
  loadSettings(profileId: string): Promise<SystemSettings | null>;

  // Desktop layout
  saveDesktopLayout(profileId: string, layout: DesktopLayout): Promise<void>;
  loadDesktopLayout(profileId: string): Promise<DesktopLayout | null>;

  // Window state
  saveWindowState(profileId: string, windows: PersistedWindowState[]): Promise<void>;
  loadWindowState(profileId: string): Promise<PersistedWindowState[]>;

  // Dock configuration
  saveDockConfig(profileId: string, config: DockConfig): Promise<void>;
  loadDockConfig(profileId: string): Promise<DockConfig | null>;

  // App-specific state
  saveAppState(profileId: string, appId: string, state: unknown): Promise<void>;
  loadAppState(profileId: string, appId: string): Promise<unknown | null>;

  // Bulk operations
  loadAllUserData(profileId: string): Promise<UserData>;
  clearAllUserData(profileId: string): Promise<void>;
}

