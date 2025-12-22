"use client";

/**
 * Desktop & Dock Settings Panel
 */

import { useState } from "react";
import { SettingRow, SettingGroup } from "../components/SettingRow";
import { Toggle, Select, Button, ChipList } from "../components/Controls";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { useDockStore } from "@/OS/store/dockStore";
import { useDesktopStore } from "@/OS/store/desktopStore";
import { getAllApps, getAppConfig } from "@/OS/lib/AppLauncher";
import { getIcon, type IconId } from "@/OS/lib/IconRegistry";
import type { DesktopSettings } from "@/OS/types/settings";
import styles from "./Panel.module.css";

export function DesktopPanel() {
  const desktop = useSettingsStore((state) => state.settings.desktop);
  const setSetting = useSettingsStore((state) => state.setSetting);
  const resetCategory = useSettingsStore((state) => state.resetCategory);

  // Desktop store for icon arrangement
  const snapToGrid = useDesktopStore((state) => state.snapToGrid);
  const setSnapToGrid = useDesktopStore((state) => state.setSnapToGrid);
  const arrangeToGrid = useDesktopStore((state) => state.arrangeToGrid);
  const addAppIcon = useDesktopStore((state) => state.addAppIcon);
  const removeAppIcon = useDesktopStore((state) => state.removeAppIcon);

  // Dock store for pinned dock apps
  const dockPinnedApps = useDockStore((state) => state.pinnedApps);
  const pinApp = useDockStore((state) => state.pinApp);
  const unpinApp = useDockStore((state) => state.unpinApp);

  // State for adding apps to menu, dock, and desktop
  const [selectedMenuApp, setSelectedMenuApp] = useState("");
  const [selectedDockApp, setSelectedDockApp] = useState("");
  const [selectedDesktopApp, setSelectedDesktopApp] = useState("");

  const handleChange = <K extends keyof DesktopSettings>(
    key: K,
    value: DesktopSettings[K]
  ) => {
    setSetting("desktop", key, value);
  };

  // Get all registered apps
  const allApps = getAllApps();

  // ===== Desktop Icons =====
  const desktopApps = desktop.desktopApps || [];
  const availableDesktopApps = allApps.filter(
    (app) => !desktopApps.includes(app.id)
  );

  const desktopAppItems = desktopApps
    .map((id) => {
      const config = getAppConfig(id);
      // Special label for Finder
      const label = id === "finder" ? "Macintosh HD" : config?.name || id;
      return config ? { id, label } : null;
    })
    .filter(Boolean) as { id: string; label: string }[];

  const handleAddDesktopApp = () => {
    if (selectedDesktopApp && !desktopApps.includes(selectedDesktopApp)) {
      handleChange("desktopApps", [...desktopApps, selectedDesktopApp]);
      addAppIcon(selectedDesktopApp);
      setSelectedDesktopApp("");
    }
  };

  const handleRemoveDesktopApp = (appId: string) => {
    handleChange(
      "desktopApps",
      desktopApps.filter((id) => id !== appId)
    );
    removeAppIcon(appId);
  };

  // ===== Berry Menu Pinned Apps =====
  const availableMenuApps = allApps.filter(
    (app) => !desktop.menuPinnedApps.includes(app.id) && app.id !== "settings"
  );

  const menuPinnedItems = desktop.menuPinnedApps
    .map((id) => {
      const config = getAppConfig(id);
      return config ? { id, label: config.name } : null;
    })
    .filter(Boolean) as { id: string; label: string }[];

  const handleAddMenuApp = () => {
    if (selectedMenuApp && !desktop.menuPinnedApps.includes(selectedMenuApp)) {
      handleChange("menuPinnedApps", [...desktop.menuPinnedApps, selectedMenuApp]);
      setSelectedMenuApp("");
    }
  };

  const handleRemoveMenuApp = (appId: string) => {
    handleChange(
      "menuPinnedApps",
      desktop.menuPinnedApps.filter((id) => id !== appId)
    );
  };

  // ===== Dock Pinned Apps =====
  const dockPinnedAppIds = dockPinnedApps.map((app) => app.appId);
  const availableDockApps = allApps.filter(
    (app) => !dockPinnedAppIds.includes(app.id)
  );

  const dockPinnedItems = dockPinnedApps.map((app) => ({
    id: app.appId,
    label: app.title,
  }));

  const handleAddDockApp = () => {
    if (selectedDockApp && !dockPinnedAppIds.includes(selectedDockApp)) {
      const config = getAppConfig(selectedDockApp);
      if (config) {
        pinApp({
          appId: config.id,
          title: config.name,
          icon: config.icon || getIcon(config.id as IconId) || getIcon("default"),
        });
      }
      setSelectedDockApp("");
    }
  };

  const handleRemoveDockApp = (appId: string) => {
    // Finder cannot be unpinned - the store handles this
    unpinApp(appId);
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Desktop & Dock</h2>

      <SettingGroup title="Desktop">
        <SettingRow
          label="Show Desktop Icons"
          description="Display app icons on the desktop"
        >
          <Toggle
            checked={desktop.showIcons}
            onChange={(checked) => handleChange("showIcons", checked)}
          />
        </SettingRow>

        <SettingRow label="Icon Grid Size" description="Spacing between desktop icons">
          <Select
            value={desktop.iconGridSize}
            options={[
              { value: "compact", label: "Compact" },
              { value: "normal", label: "Normal" },
              { value: "spacious", label: "Spacious" },
            ]}
            onChange={(value) => handleChange("iconGridSize", value)}
          />
        </SettingRow>

        <SettingRow
          label="Snap Icons to Grid"
          description="Automatically align icons when moved"
        >
          <Toggle
            checked={snapToGrid}
            onChange={(checked) => setSnapToGrid(checked)}
          />
        </SettingRow>

        <SettingRow
          label="Arrange Icons"
          description="Organize all icons in a tidy grid"
        >
          <Button variant="secondary" size="small" onClick={arrangeToGrid}>
            Arrange to Grid
          </Button>
        </SettingRow>

        <SettingRow
          label="Desktop Icons"
          description="Apps that appear as icons on the desktop"
        >
          <ChipList items={desktopAppItems} onRemove={handleRemoveDesktopApp} />
        </SettingRow>

        {availableDesktopApps.length > 0 && (
          <SettingRow label="Add to Desktop">
            <div className={styles.addAppRow}>
              <Select
                value={selectedDesktopApp}
                options={[
                  { value: "", label: "Select app..." },
                  ...availableDesktopApps.map((app) => ({
                    value: app.id,
                    label: app.name,
                  })),
                ]}
                onChange={setSelectedDesktopApp}
              />
              <Button
                variant="primary"
                size="small"
                onClick={handleAddDesktopApp}
                disabled={!selectedDesktopApp}
              >
                Add
              </Button>
            </div>
          </SettingRow>
        )}
      </SettingGroup>

      <SettingGroup title="Dock">
        <SettingRow label="Dock Position" description="Where the dock appears on screen">
          <Select
            value={desktop.dockPosition}
            options={[
              { value: "bottom", label: "Bottom" },
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            onChange={(value) => handleChange("dockPosition", value)}
          />
        </SettingRow>

        <SettingRow
          label="Auto-hide Dock"
          description="Hide dock until you hover near the edge"
        >
          <Toggle
            checked={desktop.dockAutoHide}
            onChange={(checked) => handleChange("dockAutoHide", checked)}
          />
        </SettingRow>

        <SettingRow
          label="Pinned Apps"
          description="Apps pinned to the dock (Finder cannot be removed)"
        >
          <ChipList items={dockPinnedItems} onRemove={handleRemoveDockApp} />
        </SettingRow>

        {availableDockApps.length > 0 && (
          <SettingRow label="Add to Dock">
            <div className={styles.addAppRow}>
              <Select
                value={selectedDockApp}
                options={[
                  { value: "", label: "Select app..." },
                  ...availableDockApps.map((app) => ({
                    value: app.id,
                    label: app.name,
                  })),
                ]}
                onChange={setSelectedDockApp}
              />
              <Button
                variant="primary"
                size="small"
                onClick={handleAddDockApp}
                disabled={!selectedDockApp}
              >
                Add
              </Button>
            </div>
          </SettingRow>
        )}
      </SettingGroup>

      <SettingGroup title="Berry Menu">
        <SettingRow
          label="Pinned Apps"
          description="Apps that appear in the Berry menu for quick access"
        >
          <ChipList items={menuPinnedItems} onRemove={handleRemoveMenuApp} />
        </SettingRow>

        {availableMenuApps.length > 0 && (
          <SettingRow label="Add to Menu">
            <div className={styles.addAppRow}>
              <Select
                value={selectedMenuApp}
                options={[
                  { value: "", label: "Select app..." },
                  ...availableMenuApps.map((app) => ({
                    value: app.id,
                    label: app.name,
                  })),
                ]}
                onChange={setSelectedMenuApp}
              />
              <Button
                variant="primary"
                size="small"
                onClick={handleAddMenuApp}
                disabled={!selectedMenuApp}
              >
                Add
              </Button>
            </div>
          </SettingRow>
        )}
      </SettingGroup>

      <div className={styles.note}>
        <strong>Tip:</strong> Drag the divider in the dock to resize icons.
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => resetCategory("desktop")}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}

