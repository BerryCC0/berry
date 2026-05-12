/**
 * Persistence Layer Exports
 */

export { persistence } from "./PersistenceManager";
export { InMemoryAdapter } from "./InMemoryAdapter";
// NeonAdapter is server-only (uses postgres-js / Node TCP). Import it directly
// from "./NeonAdapter" in API routes — don't barrel-export it here, since this
// index is reachable from client code and would pull Node-only modules into
// the browser bundle.
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

