"use client";

/**
 * Privacy & Data Settings Panel
 */

import { SettingRow, SettingGroup } from "../components/SettingRow";
import { Toggle, Button } from "../components/Controls";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { useWallet } from "@/OS/hooks";
import { persistence } from "@/OS/lib/Persistence";
import type { PrivacySettings } from "@/OS/types/settings";
import styles from "./Panel.module.css";

export function PrivacyPanel() {
  const privacy = useSettingsStore((state) => state.settings.privacy);
  const setSetting = useSettingsStore((state) => state.setSetting);
  const resetCategory = useSettingsStore((state) => state.resetCategory);
  const { isConnected, address, disconnect } = useWallet();

  const handleChange = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    setSetting("privacy", key, value);
  };

  const handleClearData = async () => {
    if (confirm("Are you sure you want to clear all saved data? This cannot be undone.")) {
      await persistence.clearAllUserData();
      // Optionally reload to reset state
      window.location.reload();
    }
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Privacy & Data</h2>

      <SettingGroup title="Wallet">
        <SettingRow
          label="Remember Connected Wallet"
          description="Automatically reconnect when you return"
        >
          <Toggle
            checked={privacy.rememberWallet}
            onChange={(checked) => handleChange("rememberWallet", checked)}
          />
        </SettingRow>

        <SettingRow
          label="Clear Data on Disconnect"
          description="Wipe local data when disconnecting wallet"
        >
          <Toggle
            checked={privacy.clearDataOnDisconnect}
            onChange={(checked) => handleChange("clearDataOnDisconnect", checked)}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Features">
        <SettingRow
          label="ENS Resolution"
          description="Display ENS names instead of addresses"
        >
          <Toggle
            checked={privacy.ensResolution}
            onChange={(checked) => handleChange("ensResolution", checked)}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Connection">
        {isConnected ? (
          <SettingRow
            label="Connected Wallet"
            description={`${address?.slice(0, 6)}...${address?.slice(-4)}`}
          >
            <Button variant="secondary" onClick={disconnect}>
              Manage
            </Button>
          </SettingRow>
        ) : (
          <SettingRow label="Status" description="Not connected">
            <span className={styles.statusText}>Ephemeral Session</span>
          </SettingRow>
        )}
      </SettingGroup>

      {isConnected && (
        <SettingGroup title="Data Management">
          <SettingRow
            label="Clear All Saved Data"
            description="Delete all your settings and preferences"
          >
            <Button variant="danger" onClick={handleClearData}>
              Clear Data
            </Button>
          </SettingRow>
        </SettingGroup>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => resetCategory("privacy")}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}

