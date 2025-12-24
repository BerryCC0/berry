/**
 * Event Types
 * Defines all event bus event types
 */

import type { Theme } from "./theme";

/**
 * System Events - OS components only
 */
export type SystemEvents = {
  // Window events
  "window:created": { windowId: string; appId: string };
  "window:closed": { windowId: string; appId: string };
  "window:focused": { windowId: string; previousId: string | null };
  "window:blurred": { windowId: string };
  "window:moved": { windowId: string; x: number; y: number };
  "window:resized": { windowId: string; width: number; height: number };
  "window:minimized": { windowId: string };
  "window:maximized": { windowId: string };
  "window:restored": { windowId: string };
  "window:limit-reached": { currentCount: number; limit: number };

  // Theme events
  "theme:changed": { theme: Theme };
  "theme:property-changed": { path: string; value: unknown };

  // Session events
  "session:initialized": { platform: string };
  "session:wallet-connected": {
    address: string;
    chain: string;
    chainId: number;
  };
  "session:wallet-disconnected": { address: string };
  "session:profile-loaded": { profileId: string };

  // Filesystem events
  "fs:directory-changed": { path: string };
  "fs:file-created": { path: string };
  "fs:file-deleted": { path: string };

  // App events
  "app:launched": { appId: string; windowId: string };
  "app:closed": { appId: string; windowId: string };
  "app:crashed": { appId: string; error: string };

  // Desktop events
  "desktop:icon-moved": { iconId: string; x: number; y: number };
  "desktop:icon-selected": { iconId: string };
  "desktop:selection-cleared": Record<string, never>;
}

/**
 * App Events - Communication between apps
 */
export type AppEvents = {
  "app:message": { from: string; to: string; payload: unknown };
  "app:data-shared": { from: string; dataType: string; data: unknown };
  "app:file-opened": { appId: string; filePath: string };
  "app:file-dropped": { windowId: string; filePath: string };
}

/**
 * Bridge Events - System events forwarded to apps (read-only for apps)
 */
export type BridgeEvents = {
  "bridge:theme-changed": { theme: Theme };
  "bridge:window-focused": { windowId: string; appId: string };
  "bridge:window-blurred": { windowId: string; appId: string };
  "bridge:wallet-changed": {
    address: string | null;
    chain: string | null;
    chainId: number | null;
  };
  "bridge:platform-changed": { platform: string };
}

/**
 * All event types combined
 */
export type AllEvents = SystemEvents & AppEvents & BridgeEvents;

/**
 * Event handler type
 */
export type EventHandler<T> = (data: T) => void;

