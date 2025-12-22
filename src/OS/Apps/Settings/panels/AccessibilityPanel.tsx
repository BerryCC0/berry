"use client";

/**
 * Accessibility Settings Panel
 */

import { SettingRow, SettingGroup } from "../components/SettingRow";
import { Toggle, Select, Button } from "../components/Controls";
import { useSettingsStore } from "@/OS/store/settingsStore";
import type { AccessibilitySettings } from "@/OS/types/settings";
import styles from "./Panel.module.css";

export function AccessibilityPanel() {
  const accessibility = useSettingsStore(
    (state) => state.settings.accessibility
  );
  const setSetting = useSettingsStore((state) => state.setSetting);
  const resetCategory = useSettingsStore((state) => state.resetCategory);

  const handleChange = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSetting("accessibility", key, value);
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Accessibility</h2>

      <SettingGroup title="Vision">
        <SettingRow
          label="High Contrast"
          description="Increase color contrast for better visibility"
        >
          <Toggle
            checked={accessibility.highContrast}
            onChange={(checked) => handleChange("highContrast", checked)}
          />
        </SettingRow>

        <SettingRow
          label="Large Click Targets"
          description="Make buttons and links easier to tap"
        >
          <Toggle
            checked={accessibility.largeClickTargets}
            onChange={(checked) => handleChange("largeClickTargets", checked)}
          />
        </SettingRow>

        <SettingRow
          label="Focus Indicators"
          description="Visibility of keyboard focus rings"
        >
          <Select
            value={accessibility.focusIndicators}
            options={[
              { value: "default", label: "Default" },
              { value: "enhanced", label: "Enhanced" },
            ]}
            onChange={(value) => handleChange("focusIndicators", value)}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Interaction">
        <SettingRow
          label="Keyboard Navigation"
          description="Navigate the OS using keyboard shortcuts"
        >
          <Toggle
            checked={accessibility.keyboardNavigation}
            onChange={(checked) => handleChange("keyboardNavigation", checked)}
          />
        </SettingRow>

        <SettingRow
          label="Screen Reader Hints"
          description="Enhanced labels for assistive technology"
        >
          <Toggle
            checked={accessibility.screenReaderHints}
            onChange={(checked) => handleChange("screenReaderHints", checked)}
          />
        </SettingRow>
      </SettingGroup>

      <div className={styles.note}>
        <strong>Note:</strong> Some accessibility features may require a page
        refresh to fully apply.
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => resetCategory("accessibility")}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}

