"use client";

/**
 * CommandPalette Component
 * Per HIG-SPEC-DESKTOP §6:
 *
 * Cmd+K opens a Spotlight-style search overlay.
 * Searches apps, open windows, and keyboard shortcuts.
 * Renders as a centered floating panel with fuzzy search.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useWindowStore } from "@/OS/store/windowStore";
import { getAllApps, getAppConfig, appLauncher } from "@/OS/lib/AppLauncher";
import { systemBus } from "@/OS/lib/EventBus";
import { getIcon } from "@/OS/lib/IconRegistry";
import styles from "./CommandPalette.module.css";

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  category: "app" | "window" | "action";
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const windows = useWindowStore((state) => state.windows);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);

  // Listen for toggle events from keyboard shortcuts
  useEffect(() => {
    const unsubscribe = systemBus.on("command-palette:toggle", () => {
      setIsOpen((prev) => !prev);
      setQuery("");
      setSelectedIndex(0);
    });
    return unsubscribe;
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Build searchable items
  const items = useMemo((): PaletteItem[] => {
    const result: PaletteItem[] = [];

    // Apps
    const allApps = getAllApps();
    for (const app of allApps) {
      result.push({
        id: `app-${app.id}`,
        label: app.name,
        sublabel: app.category || "Application",
        icon: app.icon,
        category: "app",
        action: () => appLauncher.launch(app.id),
      });
    }

    // Open windows
    windows.forEach((win) => {
      const config = getAppConfig(win.appId);
      result.push({
        id: `window-${win.id}`,
        label: win.title,
        sublabel: `Open window — ${config?.name || win.appId}`,
        icon: config?.icon || win.icon || getIcon("default"),
        category: "window",
        action: () => {
          if (win.isMinimized) restoreWindow(win.id);
          focusWindow(win.id);
        },
      });
    });

    // System actions
    result.push(
      {
        id: "action-settings",
        label: "System Settings",
        sublabel: "Open preferences",
        category: "action",
        action: () => appLauncher.launch("settings"),
      },
    );

    return result;
  }, [windows, focusWindow, restoreWindow]);

  // Filter items by query (simple fuzzy match)
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.sublabel?.toLowerCase().includes(q))
    );
  }, [items, query]);

  // Keep selectedIndex in bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      setIsOpen(false);
      item.action();
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
    },
    [filteredItems, selectedIndex, handleSelect]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={() => setIsOpen(false)} />

      {/* Palette */}
      <div className={styles.palette} onKeyDown={handleKeyDown}>
        <div className={styles.inputWrapper}>
          <span className={styles.searchIcon}>⌘</span>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search apps, windows, actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className={styles.results} ref={listRef}>
          {filteredItems.length === 0 && (
            <div className={styles.empty}>No results found</div>
          )}
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className={`${styles.resultItem} ${index === selectedIndex ? styles.resultItemSelected : ""}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {item.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.icon} alt="" className={styles.resultIcon} />
              )}
              <div className={styles.resultText}>
                <span className={styles.resultLabel}>{item.label}</span>
                {item.sublabel && (
                  <span className={styles.resultSublabel}>{item.sublabel}</span>
                )}
              </div>
              <span className={styles.resultCategory}>{item.category}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
