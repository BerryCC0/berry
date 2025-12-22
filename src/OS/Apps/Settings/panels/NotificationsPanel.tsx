"use client";

/**
 * Notifications Settings Panel
 */

import { SettingRow, SettingGroup } from "../components/SettingRow";
import { Toggle, Select, Slider, Button } from "../components/Controls";
import { useSettingsStore } from "@/OS/store/settingsStore";
import type { NotificationSettings } from "@/OS/types/settings";
import styles from "./Panel.module.css";

export function NotificationsPanel() {
  const notifications = useSettingsStore((state) => state.settings.notifications);
  const setSetting = useSettingsStore((state) => state.setSetting);
  const resetCategory = useSettingsStore((state) => state.resetCategory);

  const handleChange = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSetting("notifications", key, value);
  };

  const positionOptions = [
    { value: "top-right", label: "Top Right" },
    { value: "top-left", label: "Top Left" },
    { value: "bottom-right", label: "Bottom Right" },
    { value: "bottom-left", label: "Bottom Left" },
  ] as const;

  // Convert ms to seconds for display
  const durationSeconds = notifications.duration / 1000;

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Notifications</h2>

      <SettingGroup title="General">
        <SettingRow
          label="Enable Notifications"
          description="Show system notifications for events and alerts"
        >
          <Toggle
            checked={notifications.enabled}
            onChange={(checked) => handleChange("enabled", checked)}
          />
        </SettingRow>

        <SettingRow
          label="Sound Effects"
          description="Play sounds when notifications appear"
        >
          <Toggle
            checked={notifications.soundEffects}
            onChange={(checked) => handleChange("soundEffects", checked)}
            disabled={!notifications.enabled}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Display">
        <SettingRow
          label="Position"
          description="Where notifications appear on screen"
        >
          <Select
            value={notifications.position}
            options={[...positionOptions]}
            onChange={(value) => handleChange("position", value as NotificationSettings["position"])}
            disabled={!notifications.enabled}
          />
        </SettingRow>

        <SettingRow
          label="Duration"
          description={`How long notifications stay visible (${durationSeconds}s)`}
        >
          <Slider
            value={notifications.duration}
            min={3000}
            max={15000}
            step={1000}
            onChange={(value) => handleChange("duration", value)}
            showValue
            unit="ms"
            disabled={!notifications.enabled}
          />
        </SettingRow>
      </SettingGroup>

      <div className={styles.note}>
        <strong>Note:</strong> Notifications are used to alert you about system events,
        app updates, and important messages. When disabled, some important alerts may
        still appear.
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => resetCategory("notifications")}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}

