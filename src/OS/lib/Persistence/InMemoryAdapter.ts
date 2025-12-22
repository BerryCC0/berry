/**
 * InMemory Persistence Adapter
 * Used for ephemeral sessions (no wallet connected).
 * Data is stored in memory and lost on page refresh.
 */

import type { Theme } from "@/OS/types/theme";
import type { SystemSettings } from "@/OS/types/settings";
import type {
  PersistenceAdapter,
  UserProfile,
  WalletInfo,
  DesktopLayout,
  PersistedWindowState,
  DockConfig,
  UserData,
} from "./types";

export class InMemoryAdapter implements PersistenceAdapter {
  private data = new Map<string, unknown>();
  private ephemeralProfileId = "ephemeral";

  private key(profileId: string, type: string): string {
    return `${profileId}:${type}`;
  }

  // Profile management (mostly no-ops for in-memory)
  async getProfileByWallet(): Promise<UserProfile | null> {
    // In-memory adapter doesn't have persistent profiles
    return null;
  }

  async createProfile(wallet: Omit<WalletInfo, "linkedAt">): Promise<UserProfile> {
    const now = Date.now();
    return {
      id: this.ephemeralProfileId,
      primaryWallet: {
        ...wallet,
        linkedAt: now,
      },
      linkedWallets: [],
      createdAt: now,
      lastActiveAt: now,
    };
  }

  async linkWallet(): Promise<void> {
    // No-op for in-memory
  }

  async unlinkWallet(): Promise<void> {
    // No-op for in-memory
  }

  async setPrimaryWallet(): Promise<void> {
    // No-op for in-memory
  }

  async updateLastActive(): Promise<void> {
    // No-op for in-memory
  }

  // Theme
  async saveTheme(profileId: string, theme: Theme): Promise<void> {
    this.data.set(this.key(profileId, "theme"), theme);
  }

  async loadTheme(profileId: string): Promise<Theme | null> {
    return (this.data.get(this.key(profileId, "theme")) as Theme) || null;
  }

  // Settings
  async saveSettings(profileId: string, settings: SystemSettings): Promise<void> {
    this.data.set(this.key(profileId, "settings"), settings);
  }

  async loadSettings(profileId: string): Promise<SystemSettings | null> {
    return (this.data.get(this.key(profileId, "settings")) as SystemSettings) || null;
  }

  // Desktop layout
  async saveDesktopLayout(profileId: string, layout: DesktopLayout): Promise<void> {
    this.data.set(this.key(profileId, "desktop"), layout);
  }

  async loadDesktopLayout(profileId: string): Promise<DesktopLayout | null> {
    return (this.data.get(this.key(profileId, "desktop")) as DesktopLayout) || null;
  }

  // Window state
  async saveWindowState(
    profileId: string,
    windows: PersistedWindowState[]
  ): Promise<void> {
    this.data.set(this.key(profileId, "windows"), windows);
  }

  async loadWindowState(profileId: string): Promise<PersistedWindowState[]> {
    return (
      (this.data.get(this.key(profileId, "windows")) as PersistedWindowState[]) || []
    );
  }

  // Dock configuration
  async saveDockConfig(profileId: string, config: DockConfig): Promise<void> {
    this.data.set(this.key(profileId, "dock"), config);
  }

  async loadDockConfig(profileId: string): Promise<DockConfig | null> {
    return (this.data.get(this.key(profileId, "dock")) as DockConfig) || null;
  }

  // App-specific state
  async saveAppState(
    profileId: string,
    appId: string,
    state: unknown
  ): Promise<void> {
    this.data.set(this.key(profileId, `app:${appId}`), state);
  }

  async loadAppState(profileId: string, appId: string): Promise<unknown | null> {
    return this.data.get(this.key(profileId, `app:${appId}`)) || null;
  }

  // Bulk operations
  async loadAllUserData(profileId: string): Promise<UserData> {
    return {
      theme: await this.loadTheme(profileId),
      settings: await this.loadSettings(profileId),
      desktopLayout: await this.loadDesktopLayout(profileId),
      windowState: await this.loadWindowState(profileId),
      dockConfig: await this.loadDockConfig(profileId),
      appStates: {},
    };
  }

  async clearAllUserData(profileId: string): Promise<void> {
    const prefix = `${profileId}:`;
    for (const key of this.data.keys()) {
      if (key.startsWith(prefix)) {
        this.data.delete(key);
      }
    }
  }
}

