"use client";

/**
 * System Settings App
 * Configuration panel for Berry OS
 */

import { useState, useEffect } from "react";
import type { AppComponentProps } from "@/OS/types/app";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { getIcon } from "@/OS/lib/IconRegistry";
import {
  AppearancePanel,
  DesktopPanel,
  WindowsPanel,
  NotificationsPanel,
  PrivacyPanel,
  AccessibilityPanel,
  AboutPanel,
} from "./panels";
import styles from "./Settings.module.css";

type SettingsSection =
  | "appearance"
  | "desktop"
  | "windows"
  | "notifications"
  | "privacy"
  | "accessibility"
  | "about";

interface SectionConfig {
  id: SettingsSection;
  label: string;
}

const SECTIONS: SectionConfig[] = [
  { id: "appearance", label: "Appearance" },
  { id: "desktop", label: "Desktop & Dock" },
  { id: "windows", label: "Windows" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy & Data" },
  { id: "accessibility", label: "Accessibility" },
  { id: "about", label: "About" },
];

export function Settings({ initialState }: AppComponentProps) {
  const initState = initialState as { section?: SettingsSection } | undefined;
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    initState?.section || "appearance"
  );
  
  const isInitialized = useSettingsStore((state) => state.isInitialized);
  const initialize = useSettingsStore((state) => state.initialize);

  // Initialize settings store if not already
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const renderPanel = () => {
    switch (activeSection) {
      case "appearance":
        return <AppearancePanel />;
      case "desktop":
        return <DesktopPanel />;
      case "windows":
        return <WindowsPanel />;
      case "notifications":
        return <NotificationsPanel />;
      case "privacy":
        return <PrivacyPanel />;
      case "accessibility":
        return <AccessibilityPanel />;
      case "about":
        return <AboutPanel />;
      default:
        return <AppearancePanel />;
    }
  };

  return (
    <div className={styles.container}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.headerTitle}>Settings</span>
        </div>
        
        <div className={styles.sidebarItems}>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`${styles.sidebarItem} ${
                activeSection === section.id ? styles.sidebarItemActive : ""
              }`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className={styles.sidebarLabel}>{section.label}</span>
            </button>
          ))}
        </div>
      </nav>
      
      <main className={styles.content}>
        {renderPanel()}
      </main>
    </div>
  );
}
