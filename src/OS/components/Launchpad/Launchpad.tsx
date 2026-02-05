"use client";

/**
 * Launchpad
 * Full-screen overlay showing all available apps in a grid
 * Inspired by modern macOS Launchpad with folder support
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { appLauncher } from "@/OS/lib/AppLauncher";
import { useLaunchpadStore } from "@/OS/store/launchpadStore";
import { useDockStore } from "@/OS/store/dockStore";
import { systemBus } from "@/OS/lib/EventBus";
import { getIcon } from "@/OS/lib/IconRegistry";
import type { AppConfig } from "@/OS/types/app";
import styles from "./Launchpad.module.css";

const APPS_PER_PAGE = 24; // 6 columns × 4 rows

// Apps that should be hidden from Launchpad
const HIDDEN_APPS = new Set(["wallet-panel", "finder"]);

// Apps that should be grouped into folders by category
const FOLDER_CATEGORIES = new Set(["utilities"]);

interface LaunchpadFolder {
  id: string;
  name: string;
  apps: AppConfig[];
  icon: string;
}

interface LaunchpadItem {
  type: "app" | "folder";
  app?: AppConfig;
  folder?: LaunchpadFolder;
}

export function Launchpad() {
  const isOpen = useLaunchpadStore((state) => state.isOpen);
  const close = useLaunchpadStore((state) => state.close);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [openFolder, setOpenFolder] = useState<LaunchpadFolder | null>(null);
  
  // Track app registry version - increments when apps are registered
  const [appRegistryVersion, setAppRegistryVersion] = useState(0);

  // Get icon overrides from dock store (e.g., dynamic Nouns Auction icon)
  const pinnedApps = useDockStore((state) => state.pinnedApps);
  const iconOverrides = useMemo(() => {
    const overrides: Record<string, string> = {};
    pinnedApps.forEach((app) => {
      if (app.icon) {
        overrides[app.appId] = app.icon;
      }
    });
    return overrides;
  }, [pinnedApps]);

  // Get effective icon for an app (uses override if available)
  const getAppIcon = useCallback((app: AppConfig) => {
    return iconOverrides[app.id] || app.icon;
  }, [iconOverrides]);

  // Listen for boot:apps-registered event to refresh app list
  useEffect(() => {
    const handleAppsRegistered = () => {
      setAppRegistryVersion((v) => v + 1);
    };

    systemBus.on("boot:apps-registered", handleAppsRegistered);
    return () => {
      systemBus.off("boot:apps-registered", handleAppsRegistered);
    };
  }, []);

  // Build items list with folders - re-computes when apps are registered
  const { items, allAppsFlat } = useMemo(() => {
    const allApps = appLauncher.getAll().filter((app) => !HIDDEN_APPS.has(app.id));
    
    // Group apps by category
    const folders: Record<string, AppConfig[]> = {};
    const standaloneApps: AppConfig[] = [];

    allApps.forEach((app) => {
      if (app.category && FOLDER_CATEGORIES.has(app.category)) {
        if (!folders[app.category]) {
          folders[app.category] = [];
        }
        folders[app.category].push(app);
      } else {
        standaloneApps.push(app);
      }
    });

    // Sort standalone apps alphabetically
    standaloneApps.sort((a, b) => a.name.localeCompare(b.name));

    // Build items list
    const itemsList: LaunchpadItem[] = [];

    // Add standalone apps first (already sorted)
    standaloneApps.forEach((app) => {
      itemsList.push({ type: "app", app });
    });

    // Add folders (sorted alphabetically by category name)
    Object.entries(folders)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([category, apps]) => {
        if (apps.length > 0) {
          const folderName = category.charAt(0).toUpperCase() + category.slice(1);
          // Sort apps within folder alphabetically
          const sortedApps = [...apps].sort((a, b) => a.name.localeCompare(b.name));
          itemsList.push({
            type: "folder",
            folder: {
              id: category,
              name: folderName,
              apps: sortedApps,
              icon: getIcon("folder"),
            },
          });
        }
      });

    return { items: itemsList, allAppsFlat: allApps };
  }, [appRegistryVersion]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    const matchedItems: LaunchpadItem[] = [];
    
    items.forEach((item) => {
      if (item.type === "app" && item.app) {
        if (item.app.name.toLowerCase().includes(query)) {
          matchedItems.push(item);
        }
      } else if (item.type === "folder" && item.folder) {
        // When searching, show matching apps from folders directly
        item.folder.apps.forEach((app) => {
          if (app.name.toLowerCase().includes(query)) {
            matchedItems.push({ type: "app", app });
          }
        });
      }
    });
    
    return matchedItems;
  }, [items, searchQuery]);

  // Calculate pages
  const totalPages = Math.ceil(filteredItems.length / APPS_PER_PAGE);
  const currentItems = filteredItems.slice(
    currentPage * APPS_PER_PAGE,
    (currentPage + 1) * APPS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setCurrentPage(0);
      setOpenFolder(null);
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle keyboard
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openFolder) {
          setOpenFolder(null);
        } else {
          close();
        }
      } else if (e.key === "ArrowLeft" && currentPage > 0 && !openFolder) {
        setCurrentPage((p) => p - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages - 1 && !openFolder) {
        setCurrentPage((p) => p + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close, currentPage, totalPages, openFolder]);

  // Handle app launch
  const handleAppClick = useCallback(
    (app: AppConfig) => {
      close();
      setTimeout(() => {
        appLauncher.launch(app.id);
      }, 100);
    },
    [close]
  );

  // Handle folder click
  const handleFolderClick = useCallback((folder: LaunchpadFolder) => {
    setOpenFolder(folder);
  }, []);

  // Handle background click
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        if (openFolder) {
          setOpenFolder(null);
        } else {
          close();
        }
      }
    },
    [close, openFolder]
  );

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.overlay} ${isAnimating ? styles.animating : ""}`}
      onClick={handleBackgroundClick}
    >
      <div className={styles.container}>
        {/* Header with title and search */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {openFolder && (
              <button
                className={styles.backButton}
                onClick={() => setOpenFolder(null)}
              >
                ← Back
              </button>
            )}
            <h1 className={styles.title}>
              {openFolder ? openFolder.name : "Applications"}
            </h1>
          </div>
          <div className={styles.headerRight}>
            {!openFolder && (
              <div className={styles.searchContainer}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className={styles.clearSearch}
                    onClick={() => setSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            <button
              className={styles.closeButton}
              onClick={close}
              aria-label="Close Launchpad"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Apps/Folders grid */}
        <div className={styles.grid}>
          {openFolder ? (
            // Show folder contents
            openFolder.apps.map((app) => (
              <button
                key={app.id}
                className={styles.appItem}
                onClick={() => handleAppClick(app)}
              >
                <div className={styles.appIconWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAppIcon(app)}
                    alt={app.name}
                    className={styles.appIcon}
                    draggable={false}
                  />
                </div>
                <span className={styles.appName}>{app.name}</span>
              </button>
            ))
          ) : (
            // Show main grid with folders and apps
            currentItems.map((item) =>
              item.type === "app" && item.app ? (
                <button
                  key={item.app.id}
                  className={styles.appItem}
                  onClick={() => handleAppClick(item.app!)}
                >
                  <div className={styles.appIconWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getAppIcon(item.app)}
                      alt={item.app.name}
                      className={styles.appIcon}
                      draggable={false}
                    />
                  </div>
                  <span className={styles.appName}>{item.app.name}</span>
                </button>
              ) : item.type === "folder" && item.folder ? (
                <button
                  key={item.folder.id}
                  className={styles.appItem}
                  onClick={() => handleFolderClick(item.folder!)}
                >
                  <div className={styles.folderIconWrapper}>
                    {/* Show mini icons of first 4 apps */}
                    <div className={styles.folderPreview}>
                      {item.folder.apps.slice(0, 4).map((app, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={app.id}
                          src={getAppIcon(app)}
                          alt=""
                          className={styles.folderPreviewIcon}
                          draggable={false}
                        />
                      ))}
                    </div>
                  </div>
                  <span className={styles.appName}>{item.folder.name}</span>
                </button>
              ) : null
            )
          )}
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && !openFolder && (
          <div className={styles.emptyState}>
            <p>No applications found</p>
          </div>
        )}

        {/* Page dots */}
        {totalPages > 1 && !openFolder && (
          <div className={styles.pagination}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`${styles.pageDot} ${i === currentPage ? styles.active : ""}`}
                onClick={() => setCurrentPage(i)}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
