"use client";

/**
 * BerryMenu Component
 * The main system menu with About, Settings, pinned apps, and power options.
 */

import { useSettingsStore } from "@/OS/store/settingsStore";
import { useBootStore } from "@/OS/store/bootStore";
import { launchApp, getAppConfig } from "@/OS/lib/AppLauncher";

interface BerryMenuProps {
  onClose: () => void;
  styles: Record<string, string>;
}

export function BerryMenu({ onClose, styles }: BerryMenuProps) {
  const menuPinnedApps = useSettingsStore(
    (state) => state.settings.desktop.menuPinnedApps
  );
  const { sleep, restart, shutdown } = useBootStore();

  const handleLaunchApp = (appId: string) => {
    launchApp(appId);
    onClose();
  };

  const handleSleep = () => {
    sleep();
    onClose();
  };

  const handleRestart = () => {
    onClose();
    // Small delay to allow menu to close before reload
    setTimeout(() => restart(), 100);
  };

  const handleShutdown = () => {
    onClose();
    // Small delay to allow menu to close before shutdown attempt
    setTimeout(() => shutdown(), 100);
  };

  // Get app configs for pinned apps
  const pinnedAppConfigs = menuPinnedApps
    .map((appId) => getAppConfig(appId))
    .filter(Boolean);

  const handleOpenAbout = () => {
    launchApp("settings", { initialState: { section: "about" } });
    onClose();
  };

  return (
    <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
      <div
        className={styles.dropdownItem}
        onClick={handleOpenAbout}
        role="menuitem"
      >
        About Berry OS
      </div>

      <div className={styles.dropdownDivider} />

      <div
        className={styles.dropdownItem}
        onClick={() => handleLaunchApp("settings")}
        role="menuitem"
      >
        System Settings...
      </div>

      {pinnedAppConfigs.length > 0 && (
        <>
          <div className={styles.dropdownDivider} />
          {pinnedAppConfigs.map((config) => (
            <div
              key={config!.id}
              className={styles.dropdownItem}
              onClick={() => handleLaunchApp(config!.id)}
              role="menuitem"
            >
              {config!.name}
            </div>
          ))}
        </>
      )}

      <div className={styles.dropdownDivider} />

      <div
        className={styles.dropdownItem}
        onClick={handleSleep}
        role="menuitem"
      >
        Sleep
      </div>

      <div
        className={styles.dropdownItem}
        onClick={handleRestart}
        role="menuitem"
      >
        Restart...
      </div>

      <div
        className={styles.dropdownItem}
        onClick={handleShutdown}
        role="menuitem"
      >
        Shut Down...
      </div>
    </div>
  );
}
