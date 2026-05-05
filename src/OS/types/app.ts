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
  | "nouns"
  | "social"
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
 * Menu item within a menu definition
 */
export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string; // e.g. "Cmd+N", "Cmd+Shift+F"
  action: string; // action identifier dispatched via event bus
  disabled?: boolean;
  separator?: boolean; // renders as a divider line, ignores other fields
  submenu?: MenuItem[];
}

/**
 * Top-level menu (e.g. "File", "Edit", "View")
 */
export interface MenuDefinition {
  id: string;
  label: string;
  items: MenuItem[];
}

/**
 * Toolbar item injected into the title bar / nav bar
 */
export interface ToolbarItem {
  id: string;
  icon: string; // icon path or SF Symbol name
  label: string; // accessible label + tooltip
  action: string; // action identifier dispatched via event bus
  position: "leading" | "center" | "trailing";
  disabled?: boolean;
}

/**
 * Keyboard shortcut definition
 */
export interface ShortcutDefinition {
  id: string;
  key: string; // e.g. "n", "f", "1"
  modifiers: ("cmd" | "shift" | "alt" | "ctrl")[];
  action: string; // action identifier dispatched via event bus
  label: string; // human-readable description for command palette / shortcut overlay
  when?: "always" | "focused"; // "always" = OS-level, "focused" = only when app is focused (default)
}

/**
 * Platform-agnostic navigation metadata.
 * Each platform shell reads the parts it needs and ignores the rest.
 *
 * - Desktop: menus → menu bar; toolbarItems → unified toolbar slots; shortcuts → keyboard handler
 * - Tablet: toolbarItems → title bar actions; shortcuts → hardware keyboard handler
 * - Mobile: toolbarItems → ignored (no nav bar); menus → Berry menu on MenuBar
 */
export interface AppNavigationConfig {
  /** Menu bar items (desktop: shown in menu bar; tablet/mobile: ignored) */
  menus?: MenuDefinition[];

  /** Toolbar items (desktop: toolbar slots; tablet: title bar actions) */
  toolbarItems?: ToolbarItem[];

  /** Keyboard shortcuts (desktop + tablet with hardware keyboard) */
  shortcuts?: ShortcutDefinition[];

  /** Whether the app has a sidebar (desktop: affects toolbar leading slot width) */
  hasSidebar?: boolean;

  /**
   * When true, the app manages its own toolbar content via the <Toolbar> portal
   * component rather than using static `toolbarItems`. The title bar renders at
   * full height (52px) and exposes portal target slots for the app to fill.
   */
  dynamicToolbar?: boolean;
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

  // Navigation — platform shells read the parts they need
  navigation?: AppNavigationConfig;

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

