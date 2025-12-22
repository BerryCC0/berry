/**
 * Persistence Manager
 * Manages the active persistence adapter and switches between
 * in-memory (ephemeral) and API-based (persistent) storage.
 *
 * On the client side, uses ApiClientAdapter which calls API routes.
 * On the server side, uses NeonAdapter directly.
 */

import type { Theme } from "@/OS/types/theme";
import type { SystemSettings } from "@/OS/types/settings";
import type {
  PersistenceAdapter,
  UserProfile,
  DesktopLayout,
  PersistedWindowState,
  DockConfig,
  UserData,
  WalletInfo,
} from "./types";
import { InMemoryAdapter } from "./InMemoryAdapter";
import { ApiClientAdapter } from "./ApiClient";

class PersistenceManagerClass {
  private adapter: PersistenceAdapter;
  private profileId: string | null = null;
  private profile: UserProfile | null = null;
  private isUsingNeon = false;

  constructor() {
    // Start with in-memory adapter
    this.adapter = new InMemoryAdapter();
    this.profileId = "ephemeral";
  }

  /**
   * Get the current profile ID
   */
  getProfileId(): string | null {
    return this.profileId;
  }

  /**
   * Get the current profile
   */
  getProfile(): UserProfile | null {
    return this.profile;
  }

  /**
   * Check if we're using persistent storage
   */
  isPersistent(): boolean {
    return this.isUsingNeon;
  }

  /**
   * Upgrade to wallet-connected persistent storage
   * Called when a wallet is connected
   */
  async upgradeToWallet(
    wallet: Omit<WalletInfo, "linkedAt">
  ): Promise<UserProfile> {
    try {
      // Get current ephemeral data before switching
      const currentData = await this.adapter.loadAllUserData(this.profileId!);

      // Use API client adapter for client-side persistence
      const apiAdapter = new ApiClientAdapter();

      // Check if wallet already has a profile
      let profile = await apiAdapter.getProfileByWallet(
        wallet.address,
        wallet.chain
      );

      if (profile) {
        // Existing profile found - load saved data
        if (process.env.NODE_ENV === "development") {
          console.log("[Persistence] Found existing profile:", profile.id);
        }
      } else {
        // New wallet - create profile and migrate ephemeral data
        profile = await apiAdapter.createProfile(wallet);

        if (process.env.NODE_ENV === "development") {
          console.log("[Persistence] Created new profile:", profile.id);
        }

        // Migrate ephemeral data to new profile
        await this.migrateData(apiAdapter, profile.id, currentData);
      }

      // Switch to API adapter
      this.adapter = apiAdapter;
      this.profileId = profile.id;
      this.profile = profile;
      this.isUsingNeon = true;

      // Update last active timestamp
      await apiAdapter.updateLastActive(profile.id);

      return profile;
    } catch (error) {
      console.error("[Persistence] Failed to upgrade to persistent storage:", error);
      // Stay with in-memory adapter
      const profile = await this.adapter.createProfile(wallet);
      this.profile = profile;
      return profile;
    }
  }

  /**
   * Downgrade to ephemeral storage
   * Called when wallet is disconnected
   */
  downgradeToEphemeral(): void {
    this.adapter = new InMemoryAdapter();
    this.profileId = "ephemeral";
    this.profile = null;
    this.isUsingNeon = false;

    if (process.env.NODE_ENV === "development") {
      console.log("[Persistence] Downgraded to ephemeral storage");
    }
  }

  /**
   * Migrate data from one adapter to another
   */
  private async migrateData(
    targetAdapter: PersistenceAdapter,
    profileId: string,
    data: UserData
  ): Promise<void> {
    const migrations: Promise<void>[] = [];

    if (data.theme) {
      migrations.push(targetAdapter.saveTheme(profileId, data.theme));
    }
    if (data.settings) {
      migrations.push(targetAdapter.saveSettings(profileId, data.settings));
    }
    if (data.desktopLayout) {
      migrations.push(targetAdapter.saveDesktopLayout(profileId, data.desktopLayout));
    }
    if (data.windowState.length > 0) {
      migrations.push(targetAdapter.saveWindowState(profileId, data.windowState));
    }
    if (data.dockConfig) {
      migrations.push(targetAdapter.saveDockConfig(profileId, data.dockConfig));
    }

    await Promise.all(migrations);

    if (process.env.NODE_ENV === "development") {
      console.log("[Persistence] Migrated ephemeral data to profile");
    }
  }

  // Proxy methods to current adapter

  async saveTheme(theme: Theme): Promise<void> {
    if (!this.profileId) return;
    await this.adapter.saveTheme(this.profileId, theme);
  }

  async loadTheme(): Promise<Theme | null> {
    if (!this.profileId) return null;
    return this.adapter.loadTheme(this.profileId);
  }

  async saveSettings(settings: SystemSettings): Promise<void> {
    if (!this.profileId) return;
    await this.adapter.saveSettings(this.profileId, settings);
  }

  async loadSettings(profileId?: string): Promise<SystemSettings | null> {
    const id = profileId || this.profileId;
    if (!id) return null;
    return this.adapter.loadSettings(id);
  }

  async saveDesktopLayout(layout: DesktopLayout): Promise<void> {
    if (!this.profileId) return;
    await this.adapter.saveDesktopLayout(this.profileId, layout);
  }

  async loadDesktopLayout(): Promise<DesktopLayout | null> {
    if (!this.profileId) return null;
    return this.adapter.loadDesktopLayout(this.profileId);
  }

  async saveWindowState(windows: PersistedWindowState[]): Promise<void> {
    if (!this.profileId) return;
    await this.adapter.saveWindowState(this.profileId, windows);
  }

  async loadWindowState(): Promise<PersistedWindowState[]> {
    if (!this.profileId) return [];
    return this.adapter.loadWindowState(this.profileId);
  }

  async saveDockConfig(config: DockConfig): Promise<void> {
    if (!this.profileId) return;
    await this.adapter.saveDockConfig(this.profileId, config);
  }

  async loadDockConfig(): Promise<DockConfig | null> {
    if (!this.profileId) return null;
    return this.adapter.loadDockConfig(this.profileId);
  }

  async saveAppState(appId: string, state: unknown): Promise<void> {
    if (!this.profileId) return;
    await this.adapter.saveAppState(this.profileId, appId, state);
  }

  async loadAppState(appId: string): Promise<unknown | null> {
    if (!this.profileId) return null;
    return this.adapter.loadAppState(this.profileId, appId);
  }

  async loadAllUserData(): Promise<UserData | null> {
    if (!this.profileId) return null;
    return this.adapter.loadAllUserData(this.profileId);
  }

  async clearAllUserData(): Promise<void> {
    if (!this.profileId) return;
    await this.adapter.clearAllUserData(this.profileId);
  }
}

// Export singleton instance
export const persistence = new PersistenceManagerClass();

