/**
 * OS App Configuration
 * Registry of core OS applications that are always available
 */

import type { AppConfig } from "@/OS/types/app";
import { getIcon } from "@/OS/lib/IconRegistry";
import { Finder } from "./Finder/Finder";
import { Calculator } from "./Calculator/Calculator";
import { Settings } from "./Settings/Settings";
import { WalletPanel } from "./WalletPanel/WalletPanel";

/**
 * Finder - File browser
 */
const finderConfig: AppConfig = {
  id: "finder",
  name: "Finder",
  icon: getIcon("finder"),
  category: "system",
  singleton: false, // Can have multiple Finder windows
  showInDock: true,
  window: {
    width: 600,
    height: 400,
    minWidth: 300,
    minHeight: 200,
    isResizable: true,
  },
  permissions: ["filesystem:read"],
  component: Finder,
};

/**
 * Calculator - Basic calculator
 */
const calculatorConfig: AppConfig = {
  id: "calculator",
  name: "Calculator",
  icon: getIcon("calculator"),
  category: "utilities",
  singleton: true, // Only one Calculator
  showInDock: true,
  window: {
    width: 260,
    height: 380,
    minWidth: 220,
    minHeight: 320,
    isResizable: false,
  },
  permissions: [],
  component: Calculator,
};

/**
 * System Settings
 */
const settingsConfig: AppConfig = {
  id: "settings",
  name: "System Settings",
  icon: getIcon("settings"),
  category: "system",
  singleton: true, // Only one Settings window
  showInDock: true,
  window: {
    width: 700,
    height: 500,
    minWidth: 500,
    minHeight: 400,
    isResizable: true,
  },
  permissions: [],
  component: Settings,
};

/**
 * Wallet Panel - Wallet connection and management
 */
const walletPanelConfig: AppConfig = {
  id: "wallet-panel",
  name: "Wallet",
  icon: getIcon("wallet"),
  category: "system",
  singleton: true, // Only one Wallet Panel
  showInDock: false, // Accessed via MenuBar
  window: {
    width: 360,
    height: 480,
    minWidth: 320,
    minHeight: 400,
    isResizable: true,
  },
  permissions: [],
  component: WalletPanel,
};

/**
 * All OS app configurations
 * 
 * Note: No Trash app - filesystem is read-only per FILESYSTEM.md
 */
export const osAppConfigs: AppConfig[] = [
  finderConfig,
  calculatorConfig,
  settingsConfig,
  walletPanelConfig,
];

/**
 * Get OS app config by ID
 */
export function getOSAppConfig(appId: string): AppConfig | undefined {
  return osAppConfigs.find((config) => config.id === appId);
}
