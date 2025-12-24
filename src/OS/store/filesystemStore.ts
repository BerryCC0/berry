/**
 * Filesystem Store
 * Zustand store for filesystem navigation and state
 */

import { create } from "zustand";
import { filesystem, type VirtualFile } from "@/OS/lib/Filesystem";
import { getAppForMimeType } from "@/OS/lib/FileAssociations";
import { appLauncher } from "@/OS/lib/AppLauncher";
import { systemBus } from "@/OS/lib/EventBus";

interface FilesystemStore {
  // Current state
  currentPath: string;
  files: VirtualFile[];
  selectedPaths: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Navigation history
  history: string[];
  historyIndex: number;

  // Actions
  navigateTo: (path: string) => Promise<void>;
  navigateUp: () => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  refresh: () => Promise<void>;
  canGoBack: () => boolean;
  canGoForward: () => boolean;

  // Selection
  select: (path: string, multi?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (path: string) => boolean;

  // File operations
  openFile: (path: string) => void;

  // Search
  search: (query: string) => Promise<VirtualFile[]>;

  // Reset
  reset: () => void;
}

const initialState = {
  currentPath: "/",
  files: [],
  selectedPaths: new Set<string>(),
  isLoading: false,
  error: null,
  history: ["/"],
  historyIndex: 0,
};

export const useFilesystemStore = create<FilesystemStore>((set, get) => ({
  ...initialState,

  navigateTo: async (path: string) => {
    set({ isLoading: true, error: null });

    try {
      const files = await filesystem.readDirectory(path);

      const { history, historyIndex } = get();
      const newHistory = [...history.slice(0, historyIndex + 1), path];

      set({
        currentPath: path,
        files,
        selectedPaths: new Set(),
        isLoading: false,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });

      systemBus.emit("fs:directory-changed", { path });
    } catch (error) {
      console.error("[FilesystemStore] Navigation failed:", error);
      set({
        isLoading: false,
        error: `Failed to open: ${path}`,
      });
    }
  },

  navigateUp: async () => {
    const { currentPath, navigateTo } = get();
    if (currentPath === "/") return;

    const parentPath = filesystem.getParentPath(currentPath);
    await navigateTo(parentPath);
  },

  goBack: async () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const path = history[newIndex];

    set({ isLoading: true, historyIndex: newIndex });

    try {
      const files = await filesystem.readDirectory(path);
      set({
        currentPath: path,
        files,
        selectedPaths: new Set(),
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, error: `Failed to go back to: ${path}` });
    }
  },

  goForward: async () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const path = history[newIndex];

    set({ isLoading: true, historyIndex: newIndex });

    try {
      const files = await filesystem.readDirectory(path);
      set({
        currentPath: path,
        files,
        selectedPaths: new Set(),
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, error: `Failed to go forward to: ${path}` });
    }
  },

  refresh: async () => {
    const { currentPath, navigateTo } = get();
    filesystem.invalidatePath(currentPath);
    await navigateTo(currentPath);
  },

  canGoBack: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canGoForward: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  select: (path: string, multi: boolean = false) => {
    set((state) => {
      const newSelection = new Set(multi ? state.selectedPaths : []);

      if (newSelection.has(path)) {
        newSelection.delete(path);
      } else {
        newSelection.add(path);
      }

      return { selectedPaths: newSelection };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedPaths: new Set(state.files.map((f) => f.path)),
    }));
  },

  clearSelection: () => {
    set({ selectedPaths: new Set() });
  },

  isSelected: (path: string) => {
    return get().selectedPaths.has(path);
  },

  openFile: (path: string) => {
    const { files, navigateTo } = get();
    const file = files.find((f) => f.path === path);
    if (!file) return;

    if (file.type === "directory") {
      navigateTo(path);
    } else {
      // Open with appropriate app
      const appId = getAppForMimeType(file.mimeType);
      if (appId) {
        appLauncher.launch(appId, {
          initialState: { filePath: path, mimeType: file.mimeType },
        });
    } else {
      // No app to open this file type
      console.warn(`[FilesystemStore] No app available for: ${file.name} (${file.mimeType || 'unknown type'})`);
      // TODO: Show notification when notification system is implemented
    }
    }
  },

  search: async (query: string) => {
    const { currentPath } = get();
    return filesystem.search(query, currentPath);
  },

  reset: () => {
    set(initialState);
  },
}));

