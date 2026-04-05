"use client";

/**
 * Finder App - File Browser for Berry OS
 * 
 * Provides a classic Mac-style file browser with:
 * - Sidebar with quick access locations
 * - Icon or list view
 * - Navigation toolbar
 * - File/folder selection and opening
 */

import { useEffect, useState, useCallback } from "react";
import { useFilesystemStore } from "@/OS/store/filesystemStore";
import type { VirtualFile } from "@/OS/lib/Filesystem";
import type { AppComponentProps } from "@/OS/types/app";
import styles from "./Finder.module.css";

// Quick access locations for sidebar
const QUICK_ACCESS = [
  { name: "Documents", path: "/Documents", icon: "📄" },
  { name: "Pictures", path: "/Pictures", icon: "🖼️" },
  { name: "Applications", path: "/Applications", icon: "📱" },
  { name: "System", path: "/System", icon: "⚙️" },
];

type ViewMode = "icons" | "list";

export function Finder({ windowId, initialState }: AppComponentProps) {
  const {
    currentPath,
    files,
    selectedPaths,
    isLoading,
    error,
    navigateTo,
    navigateUp,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    select,
    clearSelection,
    openFile,
  } = useFilesystemStore();

  const [viewMode, setViewMode] = useState<ViewMode>("icons");

  // Initialize from route params or default to root
  useEffect(() => {
    const state = initialState as Record<string, unknown> | undefined;
    const initialPath = (state?.path as string) || "/";
    navigateTo(initialPath);
  }, []);

  // Handle file/folder click
  const handleClick = useCallback(
    (file: VirtualFile, event: React.MouseEvent) => {
      event.stopPropagation();
      const isMultiSelect = event.metaKey || event.ctrlKey;
      select(file.path, isMultiSelect);
    },
    [select]
  );

  // Handle file/folder double-click
  const handleDoubleClick = useCallback(
    (file: VirtualFile) => {
      openFile(file.path);
    },
    [openFile]
  );

  // Handle background click to clear selection
  const handleBackgroundClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Get breadcrumb parts from path
  const getBreadcrumbs = () => {
    if (currentPath === "/") return [{ name: "Root", path: "/" }];
    
    const parts = currentPath.split("/").filter(Boolean);
    return [
      { name: "Root", path: "/" },
      ...parts.map((part, index) => ({
        name: part,
        path: "/" + parts.slice(0, index + 1).join("/"),
      })),
    ];
  };

  return (
    <div className={styles.finder}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.navButtons}>
          <button
            className={styles.navButton}
            onClick={goBack}
            disabled={!canGoBack()}
            title="Go Back"
          >
            ◀
          </button>
          <button
            className={styles.navButton}
            onClick={goForward}
            disabled={!canGoForward()}
            title="Go Forward"
          >
            ▶
          </button>
          <button
            className={styles.navButton}
            onClick={navigateUp}
            disabled={currentPath === "/"}
            title="Go Up"
          >
            ▲
          </button>
        </div>

        <div className={styles.breadcrumbs}>
          {getBreadcrumbs().map((crumb, index) => (
            <span key={crumb.path}>
              {index > 0 && <span className={styles.breadcrumbSep}>/</span>}
              <button
                className={styles.breadcrumb}
                onClick={() => navigateTo(crumb.path)}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        <div className={styles.viewButtons}>
          <button
            className={`${styles.viewButton} ${viewMode === "icons" ? styles.active : ""}`}
            onClick={() => setViewMode("icons")}
            title="Icon View"
          >
            ⊞
          </button>
          <button
            className={`${styles.viewButton} ${viewMode === "list" ? styles.active : ""}`}
            onClick={() => setViewMode("list")}
            title="List View"
          >
            ≡
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <div className={styles.sidebarHeader}>Favorites</div>
            {QUICK_ACCESS.map((item) => (
              <button
                key={item.path}
                className={`${styles.sidebarItem} ${currentPath === item.path ? styles.active : ""}`}
                onClick={() => navigateTo(item.path)}
              >
                <span className={styles.sidebarIcon}>{item.icon}</span>
                <span className={styles.sidebarLabel}>{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className={styles.content} onClick={handleBackgroundClick}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>Loading...</span>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <span className={styles.errorIcon}>⚠️</span>
              <span>{error}</span>
            </div>
          ) : files.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📁</span>
              <span>This folder is empty</span>
            </div>
          ) : viewMode === "icons" ? (
            <div className={styles.iconGrid}>
              {files.map((file) => (
                <FileIcon
                  key={file.path}
                  file={file}
                  isSelected={selectedPaths.has(file.path)}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                />
              ))}
            </div>
          ) : (
            <div className={styles.listView}>
              <div className={styles.listHeader}>
                <span className={styles.listColName}>Name</span>
                <span className={styles.listColSize}>Size</span>
                <span className={styles.listColType}>Type</span>
              </div>
              {files.map((file) => (
                <FileRow
                  key={file.path}
                  file={file}
                  isSelected={selectedPaths.has(file.path)}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span>{files.length} items</span>
        {selectedPaths.size > 0 && (
          <span className={styles.statusSelected}>
            {selectedPaths.size} selected
          </span>
        )}
      </div>
    </div>
  );
}

// Icon view item component
function FileIcon({
  file,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  file: VirtualFile;
  isSelected: boolean;
  onClick: (file: VirtualFile, event: React.MouseEvent) => void;
  onDoubleClick: (file: VirtualFile) => void;
}) {
  return (
    <button
      className={`${styles.fileIcon} ${isSelected ? styles.selected : ""}`}
      onClick={(e) => onClick(file, e)}
      onDoubleClick={() => onDoubleClick(file)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={file.icon} alt="" className={styles.fileIconImage} />
      <span className={styles.fileIconName}>{file.name}</span>
    </button>
  );
}

// List view row component
function FileRow({
  file,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  file: VirtualFile;
  isSelected: boolean;
  onClick: (file: VirtualFile, event: React.MouseEvent) => void;
  onDoubleClick: (file: VirtualFile) => void;
}) {
  const formatSize = (bytes: number) => {
    if (file.type === "directory") return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getType = () => {
    if (file.type === "directory") return "Folder";
    if (file.extension) return file.extension.toUpperCase();
    return "File";
  };

  return (
    <button
      className={`${styles.listRow} ${isSelected ? styles.selected : ""}`}
      onClick={(e) => onClick(file, e)}
      onDoubleClick={() => onDoubleClick(file)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={file.icon} alt="" className={styles.listIcon} />
      <span className={styles.listColName}>{file.name}</span>
      <span className={styles.listColSize}>{formatSize(file.size)}</span>
      <span className={styles.listColType}>{getType()}</span>
    </button>
  );
}
