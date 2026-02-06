/**
 * App Launcher
 * Manages app lifecycle and launching
 * Respects settings for max open windows.
 */

import { useWindowStore } from "@/OS/store/windowStore";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { systemBus } from "@/OS/lib/EventBus";
import { getCascadePosition, resolveWindowPosition } from "@/OS/lib/WindowManager";
import type { AppConfig, AppInstance, LaunchOptions } from "@/OS/types/app";
import type { WindowConfig } from "@/OS/types/window";

/**
 * App Registry - will be populated by app configs
 */
const appRegistry = new Map<string, AppConfig>();

/**
 * Running app instances
 */
const runningInstances = new Map<string, AppInstance>();

/**
 * Register an app in the registry
 */
export function registerApp(config: AppConfig): void {
  if (appRegistry.has(config.id)) {
    console.warn(`[AppLauncher] App "${config.id}" is already registered`);
    return;
  }

  appRegistry.set(config.id, config);

  if (process.env.NODE_ENV === "development") {
    console.log(`[AppLauncher] Registered app: ${config.id}`);
  }
}

/**
 * Register multiple apps
 */
export function registerApps(configs: AppConfig[]): void {
  configs.forEach(registerApp);
}

/**
 * Get app config by ID
 */
export function getAppConfig(appId: string): AppConfig | undefined {
  return appRegistry.get(appId);
}

/**
 * Get all registered apps
 */
export function getAllApps(): AppConfig[] {
  return Array.from(appRegistry.values());
}

/**
 * Check if an app is running
 */
export function isAppRunning(appId: string): boolean {
  for (const instance of runningInstances.values()) {
    if (instance.appId === appId) {
      return true;
    }
  }
  return false;
}

/**
 * Get running instances of an app
 */
export function getRunningInstances(appId: string): AppInstance[] {
  const instances: AppInstance[] = [];
  runningInstances.forEach((instance) => {
    if (instance.appId === appId) {
      instances.push(instance);
    }
  });
  return instances;
}

/**
 * Launch an app
 */
export function launchApp(appId: string, options: LaunchOptions = {}): string | null {
  const config = appRegistry.get(appId);

  if (!config) {
    console.error(`[AppLauncher] App "${appId}" not found in registry`);
    return null;
  }

  // Check singleton constraint
  if (config.singleton && isAppRunning(appId)) {
    // Focus existing window instead
    const instances = getRunningInstances(appId);
    if (instances.length > 0) {
      const windowStore = useWindowStore.getState();
      windowStore.focusWindow(instances[0].windowId);
      return instances[0].windowId;
    }
  }

  // Check max windows setting
  const windowStore = useWindowStore.getState();
  const settingsStore = useSettingsStore.getState();
  const maxOpenWindows = settingsStore.settings.windows.maxOpenWindows;
  const currentWindowCount = windowStore.windows.size;

  if (currentWindowCount >= maxOpenWindows) {
    console.warn(
      `[AppLauncher] Cannot launch "${appId}": max windows (${maxOpenWindows}) reached`
    );
    // TODO: Emit notification when notification system is implemented
    // systemBus.emit("system:notification", { type: "warning", ... });
    return null;
  }

  // Calculate position
  // Priority: LaunchOptions x/y > config.window.x/y > config.window.position preset > cascade
  let x = options.x ?? config.window.x;
  let y = options.y ?? config.window.y;
  
  if (x === undefined || y === undefined) {
    const resolved = config.window.position
      ? resolveWindowPosition(config.window.position, config.window.width, config.window.height)
      : getCascadePosition(config.window.width, config.window.height);
    x = x ?? resolved.x;
    y = y ?? resolved.y;
  }

  // Create window config
  const windowConfig: WindowConfig = {
    title: config.name,
    icon: config.icon,
    width: config.window.width,
    height: config.window.height,
    minWidth: config.window.minWidth,
    minHeight: config.window.minHeight,
    maxWidth: config.window.maxWidth,
    maxHeight: config.window.maxHeight,
    isResizable: config.window.isResizable,
    x,
    y,
    initialState: options.initialState,
  };

  // Create the window (reuse windowStore from max windows check above)
  const windowId = windowStore.createWindow(appId, windowConfig);

  // Get the window to access instanceId
  const window = windowStore.getWindow(windowId);
  if (!window) {
    console.error(`[AppLauncher] Failed to create window for "${appId}"`);
    return null;
  }

  // Track running instance
  const instance: AppInstance = {
    instanceId: window.instanceId,
    appId,
    windowId,
    launchedAt: Date.now(),
    state: options.initialState,
  };

  runningInstances.set(window.instanceId, instance);

  // Emit launch event
  systemBus.emit("app:launched", { appId, windowId });

  if (process.env.NODE_ENV === "development") {
    console.log(`[AppLauncher] Launched app: ${appId} (window: ${windowId})`);
  }

  // Focus the window if requested (default true)
  if (options.focus !== false) {
    windowStore.focusWindow(windowId);
  }

  return windowId;
}

/**
 * Close an app instance
 */
export function closeApp(windowId: string): void {
  const windowStore = useWindowStore.getState();
  const window = windowStore.getWindow(windowId);

  if (!window) {
    console.warn(`[AppLauncher] Window "${windowId}" not found`);
    return;
  }

  // Remove from running instances
  runningInstances.delete(window.instanceId);

  // Close the window
  windowStore.closeWindow(windowId);

  // Emit close event
  systemBus.emit("app:closed", { appId: window.appId, windowId });

  if (process.env.NODE_ENV === "development") {
    console.log(`[AppLauncher] Closed app: ${window.appId} (window: ${windowId})`);
  }
}

/**
 * Close all instances of an app
 */
export function closeAllInstances(appId: string): void {
  const instances = getRunningInstances(appId);
  instances.forEach((instance) => {
    closeApp(instance.windowId);
  });
}

/**
 * App Launcher singleton for convenient access
 */
export const appLauncher = {
  register: registerApp,
  registerAll: registerApps,
  getConfig: getAppConfig,
  getAll: getAllApps,
  launch: launchApp,
  close: closeApp,
  closeAll: closeAllInstances,
  isRunning: isAppRunning,
  getInstances: getRunningInstances,
};

