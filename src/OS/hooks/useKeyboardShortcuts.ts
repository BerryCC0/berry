"use client";

/**
 * useKeyboardShortcuts Hook
 * Per HIG-SPEC-DESKTOP §3:
 *
 * Two layers of keyboard shortcuts:
 * 1. OS-level — always active (Cmd+W close, Cmd+M minimize, Cmd+K command palette, etc.)
 * 2. Per-app — active only when that app's window is focused, declared via AppNavigationConfig.shortcuts
 *
 * Uses the event bus to dispatch actions so the same action identifiers
 * can be triggered from menus, toolbar buttons, or keyboard.
 */

import { useEffect } from "react";
import { useWindowStore } from "@/OS/store/windowStore";
import { appLauncher, getAppConfig } from "@/OS/lib/AppLauncher";
import { systemBus } from "@/OS/lib/EventBus";

/** OS-level shortcuts that are always active */
const OS_SHORTCUTS: Array<{
  key: string;
  meta: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  label: string;
}> = [];

/** Build the OS shortcuts (needs store access, so we do it in the hook) */
function getOsShortcutActions(
  focusedWindowId: string | null,
  closeWindow: (id: string) => void,
  minimizeWindow: (id: string) => void,
  maximizeWindow: (id: string) => void,
) {
  return [
    {
      key: "w",
      meta: true,
      label: "Close window",
      action: () => {
        if (focusedWindowId) appLauncher.close(focusedWindowId);
      },
    },
    {
      key: "m",
      meta: true,
      label: "Minimize window",
      action: () => {
        if (focusedWindowId) minimizeWindow(focusedWindowId);
      },
    },
    {
      key: "k",
      meta: true,
      label: "Command palette",
      action: () => {
        systemBus.emit("command-palette:toggle", {});
      },
    },
    {
      key: ",",
      meta: true,
      label: "Open Settings",
      action: () => {
        appLauncher.launch("settings");
      },
    },
    {
      key: "h",
      meta: true,
      label: "Hide current app (Stage Strip)",
      action: () => {
        systemBus.emit("stage:hide-current", {});
      },
    },
  ];
}

export function useKeyboardShortcuts() {
  const focusedWindowId = useWindowStore((state) => state.focusedWindowId);
  const focusedAppId = useWindowStore((state) => {
    if (!state.focusedWindowId) return null;
    return state.windows.get(state.focusedWindowId)?.appId ?? null;
  });
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const maximizeWindow = useWindowStore((state) => state.maximizeWindow);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts with at least one modifier
      if (!e.metaKey && !e.ctrlKey && !e.altKey) return;

      const key = e.key.toLowerCase();

      // 1. Check OS-level shortcuts
      const osActions = getOsShortcutActions(
        focusedWindowId,
        (id) => appLauncher.close(id),
        minimizeWindow,
        maximizeWindow,
      );

      for (const shortcut of osActions) {
        if (
          key === shortcut.key &&
          e.metaKey === shortcut.meta &&
          !e.shiftKey &&
          !e.altKey
        ) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }

      // 2. Check per-app shortcuts for the focused app
      if (focusedAppId) {
        const appConfig = getAppConfig(focusedAppId);
        const shortcuts = appConfig?.navigation?.shortcuts;
        if (shortcuts) {
          for (const shortcut of shortcuts) {
            const mods = shortcut.modifiers;
            const needsMeta = mods.includes("cmd");
            const needsShift = mods.includes("shift");
            const needsAlt = mods.includes("alt");
            const needsCtrl = mods.includes("ctrl");

            if (
              key === shortcut.key.toLowerCase() &&
              e.metaKey === needsMeta &&
              e.shiftKey === needsShift &&
              e.altKey === needsAlt &&
              e.ctrlKey === needsCtrl
            ) {
              e.preventDefault();
              // Dispatch via event bus so any listener can handle it
              systemBus.emit("app:shortcut", {
                appId: focusedAppId,
                action: shortcut.action,
                windowId: focusedWindowId,
              });
              return;
            }
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focusedWindowId, focusedAppId, minimizeWindow, maximizeWindow]);
}
