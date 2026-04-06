/**
 * OS App Configuration
 * Registry of core OS applications that are always available
 * 
 * Apps are lazy-loaded for better bundle size per PERFORMANCE.md
 */

import { lazy } from "react";
import type { AppConfig, AppNavigationConfig } from "@/OS/types/app";
import { getIcon } from "@/OS/lib/IconRegistry";

// Lazy load all app components - each becomes its own chunk
const Finder = lazy(() => import("./system/Finder/Finder").then(m => ({ default: m.Finder })));
const Calculator = lazy(() => import("./utilities/Calculator/Calculator").then(m => ({ default: m.Calculator })));
const Settings = lazy(() => import("./system/Settings/Settings").then(m => ({ default: m.Settings })));
const WalletPanel = lazy(() => import("./system/WalletPanel/WalletPanel").then(m => ({ default: m.WalletPanel })));
const TextEditor = lazy(() => import("./utilities/TextEditor/TextEditor").then(m => ({ default: m.TextEditor })));
const ImageViewer = lazy(() => import("./utilities/ImageViewer/ImageViewer").then(m => ({ default: m.ImageViewer })));
const SoundJam = lazy(() => import("./utilities/SoundJam/SoundJam").then(m => ({ default: m.SoundJam })));
const MoviePlayer = lazy(() => import("./utilities/MoviePlayer/MoviePlayer").then(m => ({ default: m.MoviePlayer })));
const PDFViewer = lazy(() => import("./utilities/PDFViewer/PDFViewer").then(m => ({ default: m.PDFViewer })));
const Auction = lazy(() => import("./nouns/Auction/Auction").then(m => ({ default: m.Auction })));
const Camp = lazy(() => import("./nouns/Camp/Camp").then(m => ({ default: m.Camp })));
const Treasury = lazy(() => import("./nouns/Treasury/Treasury").then(m => ({ default: m.Treasury })));
const Nounspot = lazy(() => import("./nouns/Nounspot/Nounspot").then(m => ({ default: m.Nounspot })));
const CrystalBall = lazy(() => import("./nouns/CrystalBall/CrystalBall").then(m => ({ default: m.CrystalBall })));
const Probe = lazy(() => import("./nouns/Probe/Probe").then(m => ({ default: m.Probe })));
const Clients = lazy(() => import("./nouns/Clients/Clients").then(m => ({ default: m.Clients })));
const BIM = lazy(() => import("./social/BIM/BIM").then(m => ({ default: m.BIM })));

/**
 * Finder - File browser
 */
const finderNavigation: AppNavigationConfig = {
  menus: [
    {
      id: "file",
      label: "File",
      items: [
        { id: "new-window", label: "New Finder Window", shortcut: "Cmd+N", action: "finder:new-window" },
        { id: "close", label: "Close Window", shortcut: "Cmd+W", action: "window:close" },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { id: "as-icons", label: "as Icons", shortcut: "Cmd+1", action: "finder:view-icons" },
        { id: "as-list", label: "as List", shortcut: "Cmd+2", action: "finder:view-list" },
        { id: "as-columns", label: "as Columns", shortcut: "Cmd+3", action: "finder:view-columns" },
      ],
    },
    {
      id: "go",
      label: "Go",
      items: [
        { id: "back", label: "Back", shortcut: "Cmd+[", action: "finder:go-back" },
        { id: "forward", label: "Forward", shortcut: "Cmd+]", action: "finder:go-forward" },
        { id: "sep-1", label: "", separator: true, action: "" },
        { id: "home", label: "Home", action: "finder:go-home" },
        { id: "desktop", label: "Desktop", action: "finder:go-desktop" },
      ],
    },
  ],
  toolbarItems: [
    { id: "search", icon: "magnifyingglass", label: "Search", action: "finder:search", position: "center" },
  ],
  shortcuts: [
    { id: "new-window", key: "n", modifiers: ["cmd"], action: "finder:new-window", label: "New Finder Window" },
    { id: "view-icons", key: "1", modifiers: ["cmd"], action: "finder:view-icons", label: "Icon View" },
    { id: "view-list", key: "2", modifiers: ["cmd"], action: "finder:view-list", label: "List View" },
    { id: "view-columns", key: "3", modifiers: ["cmd"], action: "finder:view-columns", label: "Column View" },
  ],
  hasSidebar: true,
};

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
  navigation: finderNavigation,
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
const nounsAuctionNavigation: AppNavigationConfig = {
  tabConfig: {
    tab: "home",
    icon: "house.fill",
    label: "Home",
    order: 0,
  },
};

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
  navigation: nounsAuctionNavigation,
  component: Auction,
};

/**
 * Camp - Nouns Governance
 * Comprehensive governance app with proposals, voting, and delegation
 */
const campNavigation: AppNavigationConfig = {
  menus: [
    {
      id: "view",
      label: "View",
      items: [
        { id: "proposals", label: "Proposals", shortcut: "Cmd+1", action: "camp:view-proposals" },
        { id: "candidates", label: "Candidates", shortcut: "Cmd+2", action: "camp:view-candidates" },
        { id: "voters", label: "Voters", shortcut: "Cmd+3", action: "camp:view-voters" },
        { id: "activity", label: "Activity", shortcut: "Cmd+4", action: "camp:view-activity" },
      ],
    },
    {
      id: "proposal",
      label: "Proposal",
      items: [
        { id: "new", label: "New Proposal", shortcut: "Cmd+N", action: "camp:new-proposal" },
        { id: "sep-1", label: "", separator: true, action: "" },
        { id: "search", label: "Search Proposals", shortcut: "Cmd+F", action: "camp:search" },
      ],
    },
  ],
  // Camp uses the dynamic toolbar system — its views portal their own
  // toolbar content into the title bar via <Toolbar> from ToolbarContext.
  dynamicToolbar: true,
  shortcuts: [
    { id: "view-proposals", key: "1", modifiers: ["cmd"], action: "camp:view-proposals", label: "Show Proposals" },
    { id: "view-candidates", key: "2", modifiers: ["cmd"], action: "camp:view-candidates", label: "Show Candidates" },
    { id: "view-voters", key: "3", modifiers: ["cmd"], action: "camp:view-voters", label: "Show Voters" },
    { id: "view-activity", key: "4", modifiers: ["cmd"], action: "camp:view-activity", label: "Show Activity" },
    { id: "new-proposal", key: "n", modifiers: ["cmd"], action: "camp:new-proposal", label: "New Proposal" },
    { id: "search", key: "f", modifiers: ["cmd"], action: "camp:search", label: "Search Proposals" },
  ],
  tabConfig: {
    tab: "govern",
    icon: "building.columns",
    label: "Govern",
    order: 1,
  },
  hasSidebar: true,
};

const campConfig: AppConfig = {
  id: "camp",
  name: "Camp",
  icon: getIcon("camp"),
  category: "nouns",
  singleton: true,
  showInDock: true,
  window: {
    position: "top-left",
    width: 1100,
    height: 750,
    minWidth: 600,
    minHeight: 450,
    isResizable: true,
  },
  permissions: ["network", "wallet"],
  navigation: campNavigation,
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
 * Crystal Ball - Preview the next Noun
 * Shows what the next Noun would look like if minted at the current block
 */
const crystalBallConfig: AppConfig = {
  id: "crystal-ball",
  name: "Crystal Ball",
  icon: getIcon("crystal-ball"),
  category: "nouns",
  singleton: true,
  showInDock: true,
  window: {
    position: "bottom-right",
    width: 306,
    height: 560,
    minWidth: 306,
    minHeight: 520,
    isResizable: true,
  },
  permissions: ["network"],
  component: CrystalBall,
};

/**
 * Probe - Nouns explorer
 * Browse all Nouns with trait filtering and detail views
 */
const probeNavigation: AppNavigationConfig = {
  toolbarItems: [
    { id: "filter", icon: "line.3.horizontal.decrease", label: "Filter", action: "probe:filter", position: "trailing" },
    { id: "search", icon: "magnifyingglass", label: "Search Nouns", action: "probe:search", position: "center" },
  ],
  shortcuts: [
    { id: "search", key: "f", modifiers: ["cmd"], action: "probe:search", label: "Search Nouns" },
  ],
  tabConfig: {
    tab: "explore",
    icon: "magnifyingglass",
    label: "Explore",
    order: 2,
  },
};

const probeConfig: AppConfig = {
  id: "probe",
  name: "Probe",
  icon: getIcon("probe"),
  category: "nouns",
  singleton: true,
  showInDock: true,
  window: {
    position: "top-right",
    width: 1100,
    height: 750,
    minWidth: 360,
    minHeight: 450,
    isResizable: true,
  },
  permissions: ["network"],
  navigation: probeNavigation,
  component: Probe,
};

/**
 * Clients - Client Incentives Dashboard
 * Visualizes Nouns DAO client incentives data from Ponder
 */
const clientsConfig: AppConfig = {
  id: "clients",
  name: "Clients",
  icon: getIcon("clients"),
  category: "nouns",
  singleton: true,
  showInDock: true,
  window: {
    width: 1100,
    height: 750,
    minWidth: 600,
    minHeight: 450,
    isResizable: true,
  },
  permissions: ["network"],
  component: Clients,
};

/**
 * BIM - Berry Instant Messaging
 * Discord-like encrypted messaging using XMTP
 */
const bimNavigation: AppNavigationConfig = {
  toolbarItems: [
    { id: "compose", icon: "square.and.pencil", label: "New Message", action: "bim:compose", position: "trailing" },
  ],
  tabConfig: {
    tab: "bim",
    icon: "bubble.left.and.bubble.right.fill",
    label: "BIM",
    order: 3,
  },
  hasSidebar: true,
};

const bimConfig: AppConfig = {
  id: "bim",
  name: "BIM",
  icon: getIcon("bim"),
  category: "social",
  singleton: true,
  showInDock: true,
  window: {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    isResizable: true,
  },
  permissions: ["network", "wallet"],
  navigation: bimNavigation,
  component: BIM,
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
  crystalBallConfig,
  probeConfig,
  clientsConfig,
  bimConfig,
];

/**
 * Get OS app config by ID
 */
export function getOSAppConfig(appId: string): AppConfig | undefined {
  return osAppConfigs.find((config) => config.id === appId);
}
