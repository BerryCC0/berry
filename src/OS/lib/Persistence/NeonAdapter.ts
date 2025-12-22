/**
 * Neon Persistence Adapter
 * Used for persistent sessions (wallet connected).
 * Data is stored in Neon Postgres and survives page refresh.
 */

import { neon, NeonQueryFunction } from "@neondatabase/serverless";
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

// Type for database row results
type DbRow = Record<string, unknown>;

export class NeonAdapter implements PersistenceAdapter {
  private sql: NeonQueryFunction<false, false>;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("[NeonAdapter] DATABASE_URL environment variable is not set");
    }
    this.sql = neon(databaseUrl);
  }

  // Profile management
  async getProfileByWallet(
    address: string,
    chain: string
  ): Promise<UserProfile | null> {
    const result = await this.sql`
      SELECT p.id, p.created_at, p.last_active_at
      FROM profiles p
      JOIN wallets w ON w.profile_id = p.id
      WHERE LOWER(w.address) = LOWER(${address}) AND w.chain = ${chain}
    `;

    if (result.length === 0) return null;

    const profile = result[0];
    const wallets = await this.sql`
      SELECT address, chain, chain_id, is_primary, label, linked_at
      FROM wallets
      WHERE profile_id = ${profile.id}
    `;

    return this.mapToUserProfile(profile, wallets);
  }

  async createProfile(wallet: Omit<WalletInfo, "linkedAt">): Promise<UserProfile> {
    const profileResult = await this.sql`
      INSERT INTO profiles DEFAULT VALUES
      RETURNING id, created_at, last_active_at
    `;

    const profileId = profileResult[0].id;

    await this.sql`
      INSERT INTO wallets (address, chain, chain_id, profile_id, is_primary)
      VALUES (${wallet.address}, ${wallet.chain}, ${wallet.chainId}, ${profileId}, TRUE)
    `;

    const now = Date.now();
    return {
      id: profileId,
      primaryWallet: {
        ...wallet,
        linkedAt: now,
      },
      linkedWallets: [],
      createdAt: now,
      lastActiveAt: now,
    };
  }

  async linkWallet(
    profileId: string,
    wallet: Omit<WalletInfo, "linkedAt">
  ): Promise<void> {
    await this.sql`
      INSERT INTO wallets (address, chain, chain_id, profile_id, is_primary, label)
      VALUES (${wallet.address}, ${wallet.chain}, ${wallet.chainId}, ${profileId}, FALSE, ${wallet.label || null})
    `;
  }

  async unlinkWallet(
    profileId: string,
    address: string,
    chain: string
  ): Promise<void> {
    await this.sql`
      DELETE FROM wallets
      WHERE profile_id = ${profileId}
        AND LOWER(address) = LOWER(${address})
        AND chain = ${chain}
        AND is_primary = FALSE
    `;
  }

  async setPrimaryWallet(
    profileId: string,
    address: string,
    chain: string
  ): Promise<void> {
    // Remove primary from all wallets in profile
    await this.sql`
      UPDATE wallets SET is_primary = FALSE WHERE profile_id = ${profileId}
    `;

    // Set new primary
    await this.sql`
      UPDATE wallets SET is_primary = TRUE
      WHERE profile_id = ${profileId}
        AND LOWER(address) = LOWER(${address})
        AND chain = ${chain}
    `;
  }

  async updateLastActive(profileId: string): Promise<void> {
    await this.sql`
      UPDATE profiles SET last_active_at = NOW() WHERE id = ${profileId}
    `;
  }

  // Theme
  async saveTheme(profileId: string, theme: Theme): Promise<void> {
    await this.sql`
      INSERT INTO user_themes (profile_id, theme_data)
      VALUES (${profileId}, ${JSON.stringify(theme)})
      ON CONFLICT (profile_id)
      DO UPDATE SET theme_data = ${JSON.stringify(theme)}, updated_at = NOW()
    `;
  }

  async loadTheme(profileId: string): Promise<Theme | null> {
    const result = await this.sql`
      SELECT theme_data FROM user_themes WHERE profile_id = ${profileId}
    `;
    if (result.length === 0) return null;
    return result[0].theme_data as Theme;
  }

  // Settings
  async saveSettings(profileId: string, settings: SystemSettings): Promise<void> {
    await this.sql`
      INSERT INTO user_settings (profile_id, settings_data)
      VALUES (${profileId}, ${JSON.stringify(settings)})
      ON CONFLICT (profile_id)
      DO UPDATE SET settings_data = ${JSON.stringify(settings)}, updated_at = NOW()
    `;
  }

  async loadSettings(profileId: string): Promise<SystemSettings | null> {
    const result = await this.sql`
      SELECT settings_data FROM user_settings WHERE profile_id = ${profileId}
    `;
    if (result.length === 0) return null;
    return result[0].settings_data as SystemSettings;
  }

  // Desktop layout
  async saveDesktopLayout(profileId: string, layout: DesktopLayout): Promise<void> {
    await this.sql`
      INSERT INTO desktop_layouts (profile_id, layout_data)
      VALUES (${profileId}, ${JSON.stringify(layout)})
      ON CONFLICT (profile_id)
      DO UPDATE SET layout_data = ${JSON.stringify(layout)}, updated_at = NOW()
    `;
  }

  async loadDesktopLayout(profileId: string): Promise<DesktopLayout | null> {
    const result = await this.sql`
      SELECT layout_data FROM desktop_layouts WHERE profile_id = ${profileId}
    `;
    if (result.length === 0) return null;
    return result[0].layout_data as DesktopLayout;
  }

  // Window state
  async saveWindowState(
    profileId: string,
    windows: PersistedWindowState[]
  ): Promise<void> {
    // Clear existing windows
    await this.sql`DELETE FROM window_states WHERE profile_id = ${profileId}`;

    // Insert new windows
    for (const window of windows) {
      await this.sql`
        INSERT INTO window_states (profile_id, window_id, state_data)
        VALUES (${profileId}, ${window.id}, ${JSON.stringify(window)})
      `;
    }
  }

  async loadWindowState(profileId: string): Promise<PersistedWindowState[]> {
    const result = await this.sql`
      SELECT state_data FROM window_states WHERE profile_id = ${profileId}
    `;
    return result.map((row) => row.state_data as PersistedWindowState);
  }

  // Dock configuration
  async saveDockConfig(profileId: string, config: DockConfig): Promise<void> {
    await this.sql`
      INSERT INTO dock_configs (profile_id, config_data)
      VALUES (${profileId}, ${JSON.stringify(config)})
      ON CONFLICT (profile_id)
      DO UPDATE SET config_data = ${JSON.stringify(config)}, updated_at = NOW()
    `;
  }

  async loadDockConfig(profileId: string): Promise<DockConfig | null> {
    const result = await this.sql`
      SELECT config_data FROM dock_configs WHERE profile_id = ${profileId}
    `;
    if (result.length === 0) return null;
    return result[0].config_data as DockConfig;
  }

  // App-specific state
  async saveAppState(
    profileId: string,
    appId: string,
    state: unknown
  ): Promise<void> {
    await this.sql`
      INSERT INTO app_states (profile_id, app_id, state_data)
      VALUES (${profileId}, ${appId}, ${JSON.stringify(state)})
      ON CONFLICT (profile_id, app_id)
      DO UPDATE SET state_data = ${JSON.stringify(state)}, updated_at = NOW()
    `;
  }

  async loadAppState(profileId: string, appId: string): Promise<unknown | null> {
    const result = await this.sql`
      SELECT state_data FROM app_states
      WHERE profile_id = ${profileId} AND app_id = ${appId}
    `;
    if (result.length === 0) return null;
    return result[0].state_data;
  }

  // Bulk operations
  async loadAllUserData(profileId: string): Promise<UserData> {
    const [theme, settings, layout, windows, dock] = await Promise.all([
      this.loadTheme(profileId),
      this.loadSettings(profileId),
      this.loadDesktopLayout(profileId),
      this.loadWindowState(profileId),
      this.loadDockConfig(profileId),
    ]);

    return {
      theme,
      settings,
      desktopLayout: layout,
      windowState: windows,
      dockConfig: dock,
      appStates: {},
    };
  }

  async clearAllUserData(profileId: string): Promise<void> {
    // CASCADE should handle related tables
    await this.sql`DELETE FROM profiles WHERE id = ${profileId}`;
  }

  // Helper to map database rows to UserProfile
  private mapToUserProfile(
    profile: Record<string, unknown>,
    wallets: Record<string, unknown>[]
  ): UserProfile {
    const primaryWallet = wallets.find((w) => w.is_primary);
    const linkedWallets = wallets.filter((w) => !w.is_primary);

    if (!primaryWallet) {
      throw new Error("[NeonAdapter] Profile has no primary wallet");
    }

    return {
      id: profile.id as string,
      primaryWallet: {
        address: primaryWallet.address as string,
        chain: primaryWallet.chain as string,
        chainId: primaryWallet.chain_id as number,
        linkedAt: new Date(primaryWallet.linked_at as string).getTime(),
        label: primaryWallet.label as string | undefined,
      },
      linkedWallets: linkedWallets.map((w) => ({
        address: w.address as string,
        chain: w.chain as string,
        chainId: w.chain_id as number,
        linkedAt: new Date(w.linked_at as string).getTime(),
        label: w.label as string | undefined,
      })),
      createdAt: new Date(profile.created_at as string).getTime(),
      lastActiveAt: new Date(profile.last_active_at as string).getTime(),
    };
  }
}

