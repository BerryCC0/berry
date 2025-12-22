/**
 * Persistence Layer Exports
 */

export { persistence } from "./PersistenceManager";
export { InMemoryAdapter } from "./InMemoryAdapter";
export { NeonAdapter } from "./NeonAdapter";
export { ApiClientAdapter } from "./ApiClient";
export type {
  PersistenceAdapter,
  UserProfile,
  WalletInfo,
  DesktopLayout,
  DesktopIconState,
  DockConfig,
  PersistedWindowState,
  UserData,
} from "./types";

