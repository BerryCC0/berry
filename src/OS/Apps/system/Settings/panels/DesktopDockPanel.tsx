"use client";

/**
 * Desktop & Dock Settings Panel
 *
 * Desktop icon settings with advanced disclosure,
 * dock/berry menu with PinnedAppsList.
 */

import { useShallow } from "zustand/shallow";
import { SettingRow, SettingGroup } from "../components/SettingRow";
import { Toggle, Select, Button } from "../components/Controls";
import { PinnedAppsList } from "../components/PinnedAppsList";
import { AdvancedDisclosure } from "../components/AdvancedDisclosure";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { useDockStore } from "@/OS/store/dockStore";
import { useDesktopStore } from "@/OS/store/desktopStore";
import { getAllApps, getAppConfig } from "@/OS/lib/AppLauncher";
import { getIcon, type IconId } from "@/OS/lib/IconRegistry";
import type { DesktopSettings, AppearanceSettings } from "@/OS/types/settings";
import styles from "./Panel.module.css";

// ---------------------------------------------------------------------------
// DesktopDockPanel
// ---------------------------------------------------------------------------

export function DesktopDockPanel() {
  const desktop = useSettingsStore(useShallow((state) => state.settings.desktop));
  const appearance = useSettingsStore(useShallow((state) => state.settings.appearance));
  const setSetting = useSettingsStore((state) => state.setSetting);
  const resetCategory = useSettingsStore((state) => state.resetCategory);

  const snapToGrid = useDesktopStore((state) => state.snapToGrid);
  const setSnapToGrid = useDesktopStore((state) => state.setSnapToGrid);
  const arrangeToGrid = useDesktopStore((state) => state.arrangeToGrid);
  const addAppIcon = useDesktopStore((state) => state.addAppIcon);
  const removeAppIcon = useDesktopStore((state) => state.removeAppIcon);

  const dockPinnedApps = useDockStore(useShallow((state) => state.pinnedApps));
  const pinApp = useDockStore((state) => state.pinApp);
  const unpinApp = useDockStore((state) => state.unpinApp);

  const handleDesktopChange = <K extends keyof DesktopSettings>(key: K, value: DesktopSettings[K]) => {
    setSetting("desktop", key, value);
  };

  const handleAppearanceChange = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => {
    setSetting("appearance", key, value);
  };

  // ── Desktop Apps ──
  const allApps = getAllApps();
  const desktopApps = desktop.desktopApps || [];
  const availableDesktopApps = allApps.filter((app) => !desktopApps.includes(app.id));

  const desktopAppItems = desktopApps
    .map((id) => {
      const config = getAppConfig(id);
      const label = id === "finder" ? "Macintosh HD" : config?.name || id;
      return config ? { id, label } : null;
    })
    .filter(Boolean) as { id: string; label: string }[];

  const handleAddDesktopApp = (appId: string) => {
    if (!desktopApps.includes(appId)) {
      handleDesktopChange("desktopApps", [...desktopApps, appId]);
      addAppIcon(appId);
    }
  };

  const handleRemoveDesktopApp = (appId: string) => {
    handleDesktopChange("desktopApps", desktopApps.filter((id) => id !== appId));
    removeAppIcon(appId);
  };

  // ── Dock Apps ──
  const dockPinnedAppIds = dockPinnedApps.map((app) => app.appId);
  const availableDockApps = allApps.filter((app) => !dockPinnedAppIds.includes(app.id));

  const dockPinnedItems = dockPinnedApps.map((app) => ({
    id: app.appId,
    label: app.title,
  }));

  const handleAddDockApp = (appId: string) => {
    if (!dockPinnedAppIds.includes(appId)) {
      const config = getAppConfig(appId);
      if (config) {
        pinApp({
          appId: config.id,
          title: config.name,
          icon: config.icon || getIcon(config.id as IconId) || getIcon("default"),
        });
      }
    }
  };

  const handleRemoveDockApp = (appId: string) => {
    unpinApp(appId);
  };

  // ── Berry Menu Apps ──
  const availableMenuApps = allApps.filter(
    (app) => !desktop.menuPinnedApps.includes(app.id) && app.id !== "settings"
  );

  const menuPinnedItems = desktop.menuPinnedApps
    .map((id) => {
      const config = getAppConfig(id);
      return config ? { id, label: config.name } : null;
    })
    .filter(Boolean) as { id: string; label: string }[];

  const handleAddMenuApp = (appId: string) => {
    if (!desktop.menuPinnedApps.includes(appId)) {
      handleDesktopChange("menuPinnedApps", [...desktop.menuPinnedApps, appId]);
    }
  };

  const handleRemoveMenuApp = (appId: string) => {
    handleDesktopChange("menuPinnedApps", desktop.menuPinnedApps.filter((id) => id !== appId));
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Desktop & Dock</h2>

      {/* ── Desktop ── */}
      <SettingGroup title="Desktop">
        <SettingRow label="Show Desktop Icons" description="Display app icons on the desktop">
          <Toggle
            checked={desktop.showIcons}
            onChange={(checked) => handleDesktopChange("showIcons", checked)}
          />
        </SettingRow>

        <SettingRow label="Icon Size">
          <Select
            value={appearance.desktopIconSize}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            onChange={(value) => handleAppearanceChange("desktopIconSize", value)}
          />
        </SettingRow>

        <AdvancedDisclosure label="More Options">
          <SettingRow label="Icon Grid Spacing">
            <Select
              value={desktop.iconGridSize}
              options={[
                { value: "compact", label: "Compact" },
                { value: "normal", label: "Normal" },
                { value: "spacious", label: "Spacious" },
              ]}
              onChange={(value) => handleDesktopChange("iconGridSize", value)}
            />
          </SettingRow>

          <SettingRow label="Snap Icons to Grid" description="Align icons when dragged">
            <Toggle checked={snapToGrid} onChange={setSnapToGrid} />
          </SettingRow>

          <SettingRow label="Arrange Icons" description="Organize in a tidy grid">
            <Button variant="secondary" size="small" onClick={arrangeToGrid}>
              Arrange
            </Button>
          </SettingRow>
        </AdvancedDisclosure>
      </SettingGroup>

      {/* Desktop Apps — full-width below group */}
      <div className={styles.sectionLabel}>Desktop Apps</div>
      <PinnedAppsList
        items={desktopAppItems}
        onRemove={handleRemoveDesktopApp}
        onAdd={handleAddDesktopApp}
        availableApps={availableDesktopApps}
        placeholder="Add app..."
      />

      {/* ── Dock ── */}
      <SettingGroup title="Dock">
        <SettingRow label="Position">
          <Select
            value={desktop.dockPosition}
            options={[
              { value: "bottom", label: "Bottom" },
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            onChange={(value) => handleDesktopChange("dockPosition", value)}
          />
        </SettingRow>

        <SettingRow label="Auto-hide" description="Hide until you hover near the edge">
          <Toggle
            checked={desktop.dockAutoHide}
            onChange={(checked) => handleDesktopChange("dockAutoHide", checked)}
          />
        </SettingRow>
      </SettingGroup>

      <div className={styles.sectionLabel}>Pinned Apps</div>
      <PinnedAppsList
        items={dockPinnedItems}
        onRemove={handleRemoveDockApp}
        onAdd={handleAddDockApp}
        availableApps={availableDockApps}
        lockedIds={["finder"]}
        placeholder="Add to Dock..."
      />

      {/* ── Berry Menu ── */}
      <SettingGroup title="Berry Menu">
        <div style={{ padding: "8px 0" }}>
          <span className={styles.sectionDescription}>
            Quick-access apps in the menu at the top left of the screen.
          </span>
          <div style={{ marginTop: 8 }}>
            <PinnedAppsList
              items={menuPinnedItems}
              onRemove={handleRemoveMenuApp}
              onAdd={handleAddMenuApp}
              availableApps={availableMenuApps}
              placeholder="Add to Menu..."
            />
          </div>
        </div>
      </SettingGroup>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => resetCategory("desktop")}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
