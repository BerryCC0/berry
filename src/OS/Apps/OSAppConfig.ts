/**
 * OS App Configuration
 * Registry of core OS applications that are always available
 * 
 * Apps are lazy-loaded for better bundle size per PERFORMANCE.md
 */

import { lazy } from "react";
import type { AppConfig } from "@/OS/types/app";
import { getIcon } from "@/OS/lib/IconRegistry";

// Lazy load all app components - each becomes its own chunk
const Finder = lazy(() => import("./Finder/Finder").then(m => ({ default: m.Finder })));
const Calculator = lazy(() => import("./Calculator/Calculator").then(m => ({ default: m.Calculator })));
const Settings = lazy(() => import("./Settings/Settings").then(m => ({ default: m.Settings })));
const WalletPanel = lazy(() => import("./WalletPanel/WalletPanel").then(m => ({ default: m.WalletPanel })));
const TextEditor = lazy(() => import("./TextEditor/TextEditor").then(m => ({ default: m.TextEditor })));
const ImageViewer = lazy(() => import("./ImageViewer/ImageViewer").then(m => ({ default: m.ImageViewer })));
const SoundJam = lazy(() => import("./SoundJam/SoundJam").then(m => ({ default: m.SoundJam })));
const MoviePlayer = lazy(() => import("./MoviePlayer/MoviePlayer").then(m => ({ default: m.MoviePlayer })));
const PDFViewer = lazy(() => import("./PDFViewer/PDFViewer").then(m => ({ default: m.PDFViewer })));
const NounsAuction = lazy(() => import("./NounsAuction/NounsAuction").then(m => ({ default: m.NounsAuction })));
const Camp = lazy(() => import("./Camp/Camp").then(m => ({ default: m.Camp })));
const Treasury = lazy(() => import("./Treasury/Treasury").then(m => ({ default: m.Treasury })));
const Nounspot = lazy(() => import("./Nounspot/Nounspot").then(m => ({ default: m.Nounspot })));

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
    height: 600,
    minWidth: 320,
    minHeight: 400,
    isResizable: true,
  },
  permissions: [],
  component: WalletPanel,
};

/**
 * TextEditor - Text viewer with markdown preview
 */
const textEditorConfig: AppConfig = {
  id: "text-editor",
  name: "TextEditor",
  icon: getIcon("text-editor"),
  category: "utilities",
  singleton: false,
  showInDock: false,
  window: {
    width: 600,
    height: 500,
    minWidth: 300,
    minHeight: 200,
    isResizable: true,
  },
  permissions: ["filesystem:read"],
  component: TextEditor,
};

/**
 * ImageViewer - Image viewer with zoom and pan
 */
const imageViewerConfig: AppConfig = {
  id: "image-viewer",
  name: "ImageViewer",
  icon: getIcon("image-viewer"),
  category: "utilities",
  singleton: false,
  showInDock: false,
  window: {
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    isResizable: true,
  },
  permissions: ["filesystem:read"],
  component: ImageViewer,
};

/**
 * SoundJam - Audio player with visualization
 */
const soundJamConfig: AppConfig = {
  id: "sound-jam",
  name: "SoundJam",
  icon: getIcon("sound-jam"),
  category: "utilities",
  singleton: true,
  showInDock: false,
  window: {
    width: 400,
    height: 200,
    minWidth: 320,
    minHeight: 150,
    isResizable: true,
  },
  permissions: ["filesystem:read"],
  component: SoundJam,
};

/**
 * MoviePlayer - Video player
 */
const moviePlayerConfig: AppConfig = {
  id: "movie-player",
  name: "MoviePlayer",
  icon: getIcon("movie-player"),
  category: "utilities",
  singleton: false,
  showInDock: false,
  window: {
    width: 720,
    height: 480,
    minWidth: 400,
    minHeight: 300,
    isResizable: true,
  },
  permissions: ["filesystem:read"],
  component: MoviePlayer,
};

/**
 * PDFViewer - PDF document viewer
 */
const pdfViewerConfig: AppConfig = {
  id: "pdf-viewer",
  name: "PDFViewer",
  icon: getIcon("pdf-viewer"),
  category: "utilities",
  singleton: false,
  showInDock: false,
  window: {
    width: 700,
    height: 900,
    minWidth: 400,
    minHeight: 500,
    isResizable: true,
  },
  permissions: ["filesystem:read"],
  component: PDFViewer,
};

/**
 * Nouns Auction - Daily Nouns auction participation
 */
const nounsAuctionConfig: AppConfig = {
  id: "nouns-auction",
  name: "Nouns Auction",
  icon: getIcon("nouns-auction"),
  category: "nouns",
  singleton: true,
  showInDock: true,
  window: {
    width: 680,
    height: 520,
    minWidth: 480,
    minHeight: 400,
    isResizable: true,
  },
  permissions: [],
  component: NounsAuction,
};

/**
 * Camp - Nouns Governance
 * Comprehensive governance app with proposals, voting, and delegation
 */
const campConfig: AppConfig = {
  id: "camp",
  name: "Camp",
  icon: getIcon("camp"),
  category: "nouns",
  singleton: true,
  showInDock: true,
  window: {
    x: 20,
    y: 32,
    width: 1100,
    height: 750,
    minWidth: 600,
    minHeight: 450,
    isResizable: true,
  },
  permissions: ["network", "wallet"],
  component: Camp,
};

/**
 * Treasury - DAO treasury dashboard
 * Displays balances, tokens, and owned Nouns
 */
const treasuryConfig: AppConfig = {
  id: "treasury",
  name: "Treasury",
  icon: getIcon("treasury"),
  category: "nouns",
  singleton: true,
  showInDock: true,
  window: {
    width: 700,
    height: 600,
    minWidth: 500,
    minHeight: 450,
    isResizable: true,
  },
  permissions: ["network"],
  component: Treasury,
};

/**
 * Nounspot - World map of Nouns spots
 * Displays people, places, and things around the world
 */
const nounspotConfig: AppConfig = {
  id: "nounspot",
  name: "Nounspot",
  icon: getIcon("nounspot"),
  category: "nouns",
  singleton: true,
  showInDock: false, // Not pinned to dock
  window: {
    width: 900,
    height: 600,
    minWidth: 700,
    minHeight: 450,
    isResizable: true,
  },
  permissions: ["network"],
  component: Nounspot,
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
  textEditorConfig,
  imageViewerConfig,
  soundJamConfig,
  moviePlayerConfig,
  pdfViewerConfig,
  nounsAuctionConfig,
  campConfig,
  treasuryConfig,
  nounspotConfig,
];

/**
 * Get OS app config by ID
 */
export function getOSAppConfig(appId: string): AppConfig | undefined {
  return osAppConfigs.find((config) => config.id === appId);
}
