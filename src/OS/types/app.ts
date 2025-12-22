/**
 * App Types
 * Defines application structure and configuration
 */

import type { WindowConfig } from "./window";
import type { ComponentType } from "react";

/**
 * App categories for organization
 */
export type AppCategory =
  | "system"
  | "utilities"
  | "productivity"
  | "media"
  | "web3"
  | "games";

/**
 * App permissions that can be requested
 */
export type AppPermission =
  | "filesystem:read"
  | "filesystem:write"
  | "network"
  | "wallet"
  | "notifications"
  | "clipboard";

/**
 * File association for opening files
 */
export interface FileAssociation {
  extensions: string[];
  mimeTypes?: string[];
  description: string;
}

/**
 * App configuration for registration
 */
export interface AppConfig {
  id: string;
  name: string;
  icon: string;
  category: AppCategory;

  // Window configuration
  window: Omit<WindowConfig, "title" | "icon">;

  // Capabilities
  permissions: AppPermission[];
  fileAssociations?: FileAssociation[];

  // Behavior
  singleton?: boolean; // Only one instance allowed
  showInDock?: boolean; // Show in dock when running
  showOnDesktop?: boolean; // Show icon on desktop
  launchOnStartup?: boolean; // Launch when OS starts

  // Component (lazy loaded for user apps)
  component: ComponentType<AppComponentProps>;
}

/**
 * Props passed to app components
 */
export interface AppComponentProps {
  windowId: string;
  instanceId: string;
  appId: string;
  initialState?: unknown;

  // Window control callbacks
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onTitleChange: (title: string) => void;

  // App state callbacks
  onStateChange: (state: unknown) => void;
}

/**
 * Running app instance
 */
export interface AppInstance {
  instanceId: string;
  appId: string;
  windowId: string;
  launchedAt: number;
  state?: unknown;
}

/**
 * App launch options
 */
export interface LaunchOptions {
  initialState?: unknown;
  x?: number;
  y?: number;
  focus?: boolean;
}

/**
 * OS App registry (always loaded)
 */
export interface OSAppRegistry {
  [appId: string]: AppConfig;
}

/**
 * User App registry (lazy loaded)
 */
export interface UserAppRegistry {
  [appId: string]: () => Promise<{ default: AppConfig }>;
}

