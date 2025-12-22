/**
 * Persistence API Client
 * Client-side functions that call the persistence API routes.
 */

import type { Theme } from "@/OS/types/theme";
import type { SystemSettings } from "@/OS/types/settings";
import type {
  UserProfile,
  WalletInfo,
  DesktopLayout,
  PersistedWindowState,
  DockConfig,
  UserData,
  PersistenceAdapter,
} from "./types";

const API_URL = "/api/persistence";

async function callApi<T>(action: Record<string, unknown>): Promise<T> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "API request failed");
  }

  return result.data as T;
}

/**
 * API Client Adapter
 * Implements PersistenceAdapter using the API routes
 */
export class ApiClientAdapter implements PersistenceAdapter {
  async getProfileByWallet(
    address: string,
    chain: string
  ): Promise<UserProfile | null> {
    return callApi<UserProfile | null>({
      type: "getProfileByWallet",
      address,
      chain,
    });
  }

  async createProfile(
    wallet: Omit<WalletInfo, "linkedAt">
  ): Promise<UserProfile> {
    return callApi<UserProfile>({
      type: "createProfile",
      wallet,
    });
  }

  async linkWallet(
    profileId: string,
    wallet: Omit<WalletInfo, "linkedAt">
  ): Promise<void> {
    await callApi({
      type: "linkWallet",
      profileId,
      wallet,
    });
  }

  async unlinkWallet(
    profileId: string,
    address: string,
    chain: string
  ): Promise<void> {
    await callApi({
      type: "unlinkWallet",
      profileId,
      address,
      chain,
    });
  }

  async setPrimaryWallet(
    profileId: string,
    address: string,
    chain: string
  ): Promise<void> {
    // TODO: Implement in API
    console.warn("[ApiClient] setPrimaryWallet not implemented");
  }

  async updateLastActive(profileId: string): Promise<void> {
    await callApi({
      type: "updateLastActive",
      profileId,
    });
  }

  async saveTheme(profileId: string, theme: Theme): Promise<void> {
    await callApi({
      type: "saveTheme",
      profileId,
      theme,
    });
  }

  async loadTheme(profileId: string): Promise<Theme | null> {
    return callApi<Theme | null>({
      type: "loadTheme",
      profileId,
    });
  }

  async saveSettings(profileId: string, settings: SystemSettings): Promise<void> {
    await callApi({
      type: "saveSettings",
      profileId,
      settings,
    });
  }

  async loadSettings(profileId: string): Promise<SystemSettings | null> {
    return callApi<SystemSettings | null>({
      type: "loadSettings",
      profileId,
    });
  }

  async saveDesktopLayout(
    profileId: string,
    layout: DesktopLayout
  ): Promise<void> {
    await callApi({
      type: "saveDesktopLayout",
      profileId,
      layout,
    });
  }

  async loadDesktopLayout(profileId: string): Promise<DesktopLayout | null> {
    return callApi<DesktopLayout | null>({
      type: "loadDesktopLayout",
      profileId,
    });
  }

  async saveWindowState(
    profileId: string,
    windows: PersistedWindowState[]
  ): Promise<void> {
    await callApi({
      type: "saveWindowState",
      profileId,
      windows,
    });
  }

  async loadWindowState(profileId: string): Promise<PersistedWindowState[]> {
    return callApi<PersistedWindowState[]>({
      type: "loadWindowState",
      profileId,
    }) || [];
  }

  async saveDockConfig(profileId: string, config: DockConfig): Promise<void> {
    await callApi({
      type: "saveDockConfig",
      profileId,
      config,
    });
  }

  async loadDockConfig(profileId: string): Promise<DockConfig | null> {
    return callApi<DockConfig | null>({
      type: "loadDockConfig",
      profileId,
    });
  }

  async saveAppState(
    profileId: string,
    appId: string,
    state: unknown
  ): Promise<void> {
    await callApi({
      type: "saveAppState",
      profileId,
      appId,
      state,
    });
  }

  async loadAppState(profileId: string, appId: string): Promise<unknown | null> {
    return callApi<unknown | null>({
      type: "loadAppState",
      profileId,
      appId,
    });
  }

  async loadAllUserData(profileId: string): Promise<UserData> {
    return callApi<UserData>({
      type: "loadAllUserData",
      profileId,
    });
  }

  async clearAllUserData(profileId: string): Promise<void> {
    await callApi({
      type: "clearAllUserData",
      profileId,
    });
  }
}

