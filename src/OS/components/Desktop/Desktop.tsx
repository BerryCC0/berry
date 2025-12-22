"use client";

/**
 * Desktop Component
 * The main desktop container with background and icon grid
 * Respects settings for showing icons and grid size.
 */

import { useCallback } from "react";
import { usePlatform } from "@/OS/lib/PlatformDetection";
import { useDesktopStore } from "@/OS/store/desktopStore";
import { useWindowStore } from "@/OS/store/windowStore";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { DesktopIcon } from "./components/DesktopIcon";
import desktopStyles from "./Desktop.desktop.module.css";
import mobileStyles from "./Desktop.mobile.module.css";

export function Desktop() {
  const platform = usePlatform();
  const isMobile = platform.type === "mobile" || platform.type === "farcaster";
  const styles = isMobile ? mobileStyles : desktopStyles;

  const icons = useDesktopStore((state) => state.icons);
  const selectedIconId = useDesktopStore((state) => state.selectedIconId);
  const selectIcon = useDesktopStore((state) => state.selectIcon);
  const blurAllWindows = useWindowStore((state) => state.blurAllWindows);

  // Settings - show icons and grid size
  const showIcons = useSettingsStore((state) => state.settings.desktop.showIcons);
  const iconGridSize = useSettingsStore((state) => state.settings.desktop.iconGridSize);

  // Click on desktop background clears selection
  const handleDesktopClick = useCallback(
    (e: React.MouseEvent) => {
      // Only if clicking directly on desktop, not on an icon
      if (e.target === e.currentTarget) {
        selectIcon(null);
        blurAllWindows();
      }
    },
    [selectIcon, blurAllWindows]
  );

  // Grid size class
  const gridClass = styles[`grid${iconGridSize.charAt(0).toUpperCase()}${iconGridSize.slice(1)}`] || "";

  return (
    <div className={styles.desktop} onClick={handleDesktopClick}>
      {showIcons && (
        <div className={`${styles.iconContainer} ${gridClass}`}>
          {icons.map((icon) => (
            <DesktopIcon
              key={icon.id}
              icon={icon}
              isSelected={selectedIconId === icon.id}
              styles={styles}
            />
          ))}
        </div>
      )}
    </div>
  );
}

