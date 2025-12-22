"use client";

/**
 * Windows Settings Panel
 */

import { SettingRow, SettingGroup } from "../components/SettingRow";
import { Toggle, Slider, Button } from "../components/Controls";
import { useSettingsStore } from "@/OS/store/settingsStore";
import type { WindowSettings } from "@/OS/types/settings";
import styles from "./Panel.module.css";

export function WindowsPanel() {
  const windows = useSettingsStore((state) => state.settings.windows);
  const setSetting = useSettingsStore((state) => state.setSetting);
  const resetCategory = useSettingsStore((state) => state.resetCategory);

  const handleChange = <K extends keyof WindowSettings>(
    key: K,
    value: WindowSettings[K]
  ) => {
    setSetting("windows", key, value);
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Windows</h2>

      <SettingGroup title="Appearance">
        <SettingRow
          label="Show Window Shadows"
          description="Display drop shadows under windows"
        >
          <Toggle
            checked={windows.showShadows}
            onChange={(checked) => handleChange("showShadows", checked)}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Behavior">
        <SettingRow
          label="Snap to Edges"
          description="Windows snap when dragged near screen edges"
        >
          <Toggle
            checked={windows.snapToEdges}
            onChange={(checked) => handleChange("snapToEdges", checked)}
          />
        </SettingRow>

        <SettingRow
          label="Snap Threshold"
          description="Distance from edge to trigger snap"
        >
          <Slider
            value={windows.snapThreshold}
            min={10}
            max={50}
            step={5}
            onChange={(value) => handleChange("snapThreshold", value)}
            showValue
            unit="px"
            disabled={!windows.snapToEdges}
          />
        </SettingRow>

        <SettingRow
          label="Remember Window Positions"
          description="Restore window layout when you return"
        >
          <Toggle
            checked={windows.rememberPositions}
            onChange={(checked) => handleChange("rememberPositions", checked)}
          />
        </SettingRow>

        <SettingRow
          label="Maximum Open Windows"
          description="Limit simultaneous windows for performance"
        >
          <Slider
            value={windows.maxOpenWindows}
            min={10}
            max={50}
            step={5}
            onChange={(value) => handleChange("maxOpenWindows", value)}
            showValue
          />
        </SettingRow>
      </SettingGroup>

      <div className={styles.note}>
        <strong>Tip:</strong> Double-click a title bar to minimize the window.
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => resetCategory("windows")}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}

