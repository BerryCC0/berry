/**
 * Berry OS Library Exports
 */

// Event Bus
export { systemBus, appBus, bridgeBus, initializeBridgeForwarding } from "./EventBus";
export {
  useSystemEvent,
  useAppEvent,
  useBridgeEvent,
  useEmitSystemEvent,
  useEmitAppEvent,
} from "./useEventBus";

// Platform Detection
export {
  PlatformProvider,
  usePlatform,
  useIsMobile,
  useSupportsHover,
  usePlatformType,
  detectPlatform,
} from "./PlatformDetection";

// App Lifecycle
export { appLauncher, registerApp, registerApps, launchApp, closeApp } from "./AppLauncher";
export {
  bootBerryOS,
  isOSBooted,
  shutdownBerryOS,
  loadPersistedData,
  clearPersistedDataFlag,
} from "./Boot";

// Window Management
export {
  windowManager,
  getCascadePosition,
  getViewportBounds,
  tileWindows,
  stackWindows,
  findWindowAt,
  enforceWindowBounds,
  enforceAllWindowBounds,
  minimizeAllWindows,
  closeAllWindows,
  bringAppToFront,
  focusNextWindow,
  focusPreviousWindow,
} from "./WindowManager";

// Theme
export { ThemeProvider, useTheme } from "./ThemeProvider";

// Icons
export {
  getIcon,
  getAppIcon,
  getIconForExtension,
  getIconForMimeType,
  getIconForFile,
  hasIcon,
  getAllIconIds,
  iconRegistry_ as iconRegistry,
} from "./IconRegistry";
export type { IconId, SystemIconId, AppIconId, FileIconId } from "./IconRegistry";

// Persistence
export { persistence } from "./Persistence";
export type {
  PersistenceAdapter,
  UserProfile,
  WalletInfo,
  DesktopLayout,
  DockConfig,
  PersistedWindowState,
  UserData,
} from "./Persistence";

// ENS Resolution
export { ensService } from "./ENSService";

