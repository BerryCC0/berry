/**
 * Tab Store
 * Manages the iOS-style tab bar state and per-tab navigation stacks.
 *
 * Per HIG-SPEC-MOBILE §2, §4, §12:
 * - 5 tabs maximum (4 app tabs + More)
 * - Each tab maintains an independent navigation stack
 * - Tap active tab → popToRoot
 * - Stack depth max 10
 */

import { create } from "zustand";
import { getAllApps } from "@/OS/lib/AppLauncher";
import type { TabConfig } from "@/OS/types/app";

export interface NavigationScreen {
  appId: string;
  screenId: string;
  title: string;
  params?: unknown;
  largeTitleEnabled?: boolean;
}

interface TabDefinition {
  id: string;
  icon: string;
  label: string;
  order: number;
  rootAppId: string;
}

interface TabStore {
  /** Currently active tab */
  activeTab: string;
  /** Ordered tab definitions */
  tabs: TabDefinition[];
  /** Per-tab navigation stacks */
  stacks: Map<string, NavigationScreen[]>;
  /** Whether tabs have been initialized */
  isInitialized: boolean;

  /** Initialize tabs from app configs */
  initialize: () => void;
  /** Switch to a tab */
  switchTab: (tabId: string) => void;
  /** Push a screen onto the active tab's stack */
  push: (screen: NavigationScreen) => void;
  /** Pop the top screen from the active tab's stack */
  pop: () => NavigationScreen | undefined;
  /** Pop to root of the active tab's stack */
  popToRoot: () => void;
  /** Replace the top screen on the active tab's stack */
  replace: (screen: NavigationScreen) => void;
  /** Get the current (top) screen of the active tab */
  getCurrentScreen: () => NavigationScreen | undefined;
  /** Get the stack depth of the active tab */
  getDepth: () => number;
}

const MAX_STACK_DEPTH = 10;

export const useTabStore = create<TabStore>((set, get) => ({
  activeTab: "home",
  tabs: [],
  stacks: new Map(),
  isInitialized: false,

  initialize: () => {
    const allApps = getAllApps();
    const tabDefs: TabDefinition[] = [];

    // Collect tabs from app configs
    for (const app of allApps) {
      const tabConfig = app.navigation?.tabConfig;
      if (tabConfig) {
        tabDefs.push({
          id: tabConfig.tab,
          icon: tabConfig.icon,
          label: tabConfig.label,
          order: tabConfig.order,
          rootAppId: app.id,
        });
      }
    }

    // Sort by order
    tabDefs.sort((a, b) => a.order - b.order);

    // Add the "More" tab (always last)
    tabDefs.push({
      id: "more",
      icon: "ellipsis.circle",
      label: "More",
      order: 99,
      rootAppId: "launchpad",
    });

    // Initialize stacks with root screens
    const stacks = new Map<string, NavigationScreen[]>();
    for (const tab of tabDefs) {
      stacks.set(tab.id, [
        {
          appId: tab.rootAppId,
          screenId: "root",
          title: tab.label,
          largeTitleEnabled: true,
        },
      ]);
    }

    set({
      tabs: tabDefs,
      stacks,
      activeTab: tabDefs[0]?.id || "home",
      isInitialized: true,
    });
  },

  switchTab: (tabId) => {
    const { activeTab } = get();
    if (tabId === activeTab) {
      // Tap on active tab → pop to root
      get().popToRoot();
    } else {
      set({ activeTab: tabId });
    }
  },

  push: (screen) => {
    const { activeTab, stacks } = get();
    const stack = stacks.get(activeTab);
    if (!stack) return;

    if (stack.length >= MAX_STACK_DEPTH) {
      console.warn(`[TabStore] Navigation stack depth limit (${MAX_STACK_DEPTH}) reached`);
      return;
    }

    const newStacks = new Map(stacks);
    newStacks.set(activeTab, [...stack, screen]);
    set({ stacks: newStacks });
  },

  pop: () => {
    const { activeTab, stacks } = get();
    const stack = stacks.get(activeTab);
    if (!stack || stack.length <= 1) return undefined;

    const popped = stack[stack.length - 1];
    const newStacks = new Map(stacks);
    newStacks.set(activeTab, stack.slice(0, -1));
    set({ stacks: newStacks });
    return popped;
  },

  popToRoot: () => {
    const { activeTab, stacks } = get();
    const stack = stacks.get(activeTab);
    if (!stack || stack.length <= 1) return;

    const newStacks = new Map(stacks);
    newStacks.set(activeTab, [stack[0]]);
    set({ stacks: newStacks });
  },

  replace: (screen) => {
    const { activeTab, stacks } = get();
    const stack = stacks.get(activeTab);
    if (!stack || stack.length === 0) return;

    const newStacks = new Map(stacks);
    newStacks.set(activeTab, [...stack.slice(0, -1), screen]);
    set({ stacks: newStacks });
  },

  getCurrentScreen: () => {
    const { activeTab, stacks } = get();
    const stack = stacks.get(activeTab);
    if (!stack || stack.length === 0) return undefined;
    return stack[stack.length - 1];
  },

  getDepth: () => {
    const { activeTab, stacks } = get();
    return stacks.get(activeTab)?.length || 0;
  },
}));
