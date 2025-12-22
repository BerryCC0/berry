/**
 * Desktop Store
 * Manages desktop icons and layout
 * 
 * Per ARCHITECTURE.md, emits desktop events for icon interactions
 */

import { create } from "zustand";
import { systemBus } from "@/OS/lib/EventBus";
import { getIcon, type IconId } from "@/OS/lib/IconRegistry";
import { getAppConfig } from "@/OS/lib/AppLauncher";

export interface DesktopIcon {
  id: string;
  appId: string;
  label: string;
  icon: string;
  x: number;
  y: number;
}

interface DesktopLayout {
  icons: DesktopIcon[];
  gridSize: number;
  snapToGrid: boolean;
}

interface DesktopStore {
  // State
  icons: DesktopIcon[];
  selectedIconId: string | null;
  gridSize: number;
  snapToGrid: boolean;
  isInitialized: boolean;

  // Actions
  initialize: (savedIcons?: DesktopIcon[]) => void;
  restoreLayout: (layout: DesktopLayout) => void;
  syncWithApps: (appIds: string[]) => void;
  addIcon: (icon: Omit<DesktopIcon, "id">) => string;
  addAppIcon: (appId: string) => string | null;
  removeIcon: (iconId: string) => void;
  removeAppIcon: (appId: string) => void;
  moveIcon: (iconId: string, x: number, y: number) => void;
  selectIcon: (iconId: string | null) => void;
  clearSelection: () => void;
  setGridSize: (size: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  arrangeToGrid: () => void;
  resetLayout: () => void;
}

/**
 * Generate a unique icon ID
 */
function generateIconId(): string {
  return `icon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Default desktop icons
 * 
 * Note: No Trash icon - filesystem is read-only per FILESYSTEM.md
 */
const DEFAULT_ICONS: DesktopIcon[] = [
  {
    id: "icon-hd",
    appId: "finder",
    label: "Macintosh HD",
    icon: getIcon("hard-drive"),
    x: 16,
    y: 16,
  },
];

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  // Initial state
  icons: DEFAULT_ICONS,
  selectedIconId: null,
  gridSize: 80,
  snapToGrid: false, // Default to free placement, users can enable snap
  isInitialized: false,

  // Actions
  initialize: (savedIcons) => {
    if (get().isInitialized) return;
    
    if (savedIcons && savedIcons.length > 0) {
      set({ icons: savedIcons, isInitialized: true });
    } else {
      set({ icons: DEFAULT_ICONS, isInitialized: true });
    }
    
    if (process.env.NODE_ENV === "development") {
      console.log("[desktopStore] Initialized with", savedIcons?.length || DEFAULT_ICONS.length, "icons");
    }
  },

  restoreLayout: (layout) => {
    set({
      icons: layout.icons,
      gridSize: layout.gridSize,
      snapToGrid: layout.snapToGrid,
    });
    
    if (process.env.NODE_ENV === "development") {
      console.log("[desktopStore] Layout restored with", layout.icons.length, "icons");
    }
  },

  syncWithApps: (appIds: string[]) => {
    const { icons, gridSize } = get();
    
    // Get current app IDs on desktop
    const currentAppIds = icons.map((i) => i.appId);
    
    // Find apps to add (in appIds but not on desktop)
    const appsToAdd = appIds.filter((id) => !currentAppIds.includes(id));
    
    // Find icons to remove (on desktop but not in appIds)
    const iconsToRemove = icons.filter((i) => !appIds.includes(i.appId));
    
    // Remove icons not in the new list
    let updatedIcons = icons.filter((i) => appIds.includes(i.appId));
    
    // Add new icons
    const padding = 16;
    appsToAdd.forEach((appId, index) => {
      const config = getAppConfig(appId);
      if (!config) return;
      
      // Find next available position
      const existingCount = updatedIcons.length;
      const col = existingCount % 10;
      const row = Math.floor(existingCount / 10);
      
      // Special label for Finder (shows as Macintosh HD)
      const label = appId === "finder" ? "Macintosh HD" : config.name;
      const iconId = appId === "finder" ? getIcon("hard-drive") : 
                     (config.icon || getIcon(appId as IconId) || getIcon("default"));
      
      updatedIcons.push({
        id: generateIconId(),
        appId,
        label,
        icon: iconId,
        x: padding + col * gridSize,
        y: padding + row * gridSize,
      });
    });
    
    set({ icons: updatedIcons });
    
    if (process.env.NODE_ENV === "development") {
      console.log("[desktopStore] Synced with apps:", appIds);
    }
  },

  addIcon: (iconData) => {
    const iconId = generateIconId();
    const { gridSize, snapToGrid, icons } = get();

    // Snap to grid if enabled
    let { x, y } = iconData;
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    const icon: DesktopIcon = {
      ...iconData,
      id: iconId,
      x,
      y,
    };

    set({ icons: [...icons, icon] });
    return iconId;
  },

  addAppIcon: (appId: string) => {
    const { icons, gridSize } = get();
    
    // Check if app already has an icon
    if (icons.some((i) => i.appId === appId)) {
      return null;
    }
    
    const config = getAppConfig(appId);
    if (!config) return null;
    
    // Find next available position
    const padding = 16;
    const existingCount = icons.length;
    const col = existingCount % 10;
    const row = Math.floor(existingCount / 10);
    
    // Special label for Finder (shows as Macintosh HD)
    const label = appId === "finder" ? "Macintosh HD" : config.name;
    const iconPath = appId === "finder" ? getIcon("hard-drive") : 
                     (config.icon || getIcon(appId as IconId) || getIcon("default"));
    
    const iconId = generateIconId();
    const newIcon: DesktopIcon = {
      id: iconId,
      appId,
      label,
      icon: iconPath,
      x: padding + col * gridSize,
      y: padding + row * gridSize,
    };
    
    set({ icons: [...icons, newIcon] });
    
    if (process.env.NODE_ENV === "development") {
      console.log("[desktopStore] Added app icon:", appId);
    }
    
    return iconId;
  },

  removeIcon: (iconId: string) => {
    const { selectedIconId } = get();

    set((state) => ({
      icons: state.icons.filter((i) => i.id !== iconId),
      selectedIconId:
        state.selectedIconId === iconId ? null : state.selectedIconId,
    }));

    // Emit selection cleared if this was the selected icon
    if (selectedIconId === iconId) {
      systemBus.emit("desktop:selection-cleared", {});
    }
  },

  removeAppIcon: (appId: string) => {
    const { icons, selectedIconId } = get();
    const iconToRemove = icons.find((i) => i.appId === appId);
    
    if (!iconToRemove) return;
    
    set((state) => ({
      icons: state.icons.filter((i) => i.appId !== appId),
      selectedIconId:
        state.selectedIconId === iconToRemove.id ? null : state.selectedIconId,
    }));

    // Emit selection cleared if this was the selected icon
    if (selectedIconId === iconToRemove.id) {
      systemBus.emit("desktop:selection-cleared", {});
    }
    
    if (process.env.NODE_ENV === "development") {
      console.log("[desktopStore] Removed app icon:", appId);
    }
  },

  moveIcon: (iconId: string, x: number, y: number) => {
    const { gridSize, snapToGrid } = get();

    // Snap to grid if enabled
    let finalX = x;
    let finalY = y;
    if (snapToGrid) {
      finalX = Math.round(x / gridSize) * gridSize;
      finalY = Math.round(y / gridSize) * gridSize;
    }

    set((state) => ({
      icons: state.icons.map((icon) =>
        icon.id === iconId ? { ...icon, x: finalX, y: finalY } : icon
      ),
    }));

    // Emit move event
    systemBus.emit("desktop:icon-moved", { iconId, x: finalX, y: finalY });
  },

  selectIcon: (iconId: string | null) => {
    const { selectedIconId: previousSelectedId } = get();

    set({ selectedIconId: iconId });

    // Emit appropriate event
    if (iconId === null) {
      if (previousSelectedId !== null) {
        systemBus.emit("desktop:selection-cleared", {});
      }
    } else {
      systemBus.emit("desktop:icon-selected", { iconId });
    }
  },

  clearSelection: () => {
    const { selectedIconId } = get();

    if (selectedIconId !== null) {
      set({ selectedIconId: null });
      systemBus.emit("desktop:selection-cleared", {});
    }
  },

  setGridSize: (size: number) => {
    set({ gridSize: size });
  },

  setSnapToGrid: (snap: boolean) => {
    set({ snapToGrid: snap });
  },

  arrangeToGrid: () => {
    const { icons, gridSize } = get();
    
    // Sort icons by their current position (top-to-bottom, left-to-right)
    const sortedIcons = [...icons].sort((a, b) => {
      const rowA = Math.floor(a.y / gridSize);
      const rowB = Math.floor(b.y / gridSize);
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });
    
    // Arrange in a grid starting from top-left
    const padding = 16;
    const arrangedIcons = sortedIcons.map((icon, index) => {
      // Calculate how many icons fit per row (assuming desktop width ~1200px, minus padding)
      const iconsPerRow = 10;
      const col = index % iconsPerRow;
      const row = Math.floor(index / iconsPerRow);
      
      return {
        ...icon,
        x: padding + col * gridSize,
        y: padding + row * gridSize,
      };
    });
    
    set({ icons: arrangedIcons });
    
    // Emit event for each moved icon
    arrangedIcons.forEach((icon) => {
      systemBus.emit("desktop:icon-moved", { iconId: icon.id, x: icon.x, y: icon.y });
    });
    
    if (process.env.NODE_ENV === "development") {
      console.log("[desktopStore] Icons arranged to grid");
    }
  },

  resetLayout: () => {
    const { selectedIconId } = get();

    set({
      icons: DEFAULT_ICONS,
      selectedIconId: null,
    });

    // Emit selection cleared if something was selected
    if (selectedIconId !== null) {
      systemBus.emit("desktop:selection-cleared", {});
    }
  },
}));
