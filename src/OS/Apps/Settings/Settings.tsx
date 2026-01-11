"use client";

/**
 * System Settings App
 * Configuration panel for Berry OS
 */

import { useState, useEffect } from "react";
import type { AppComponentProps } from "@/OS/types/app";
import { useSettingsStore } from "@/OS/store/settingsStore";
import { useTranslation } from "@/OS/lib/i18n";
import {
  AppearancePanel,
  DesktopPanel,
  WindowsPanel,
  LanguagePanel,
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
  | "language"
  | "notifications"
  | "privacy"
  | "accessibility"
  | "about";

interface SectionConfig {
  id: SettingsSection;
  labelKey: string;
}

const SECTIONS: SectionConfig[] = [
  { id: "appearance", labelKey: "settings.sections.appearance" },
  { id: "desktop", labelKey: "settings.sections.desktop" },
  { id: "windows", labelKey: "settings.sections.windows" },
  { id: "language", labelKey: "settings.sections.language" },
  { id: "notifications", labelKey: "settings.sections.notifications" },
  { id: "privacy", labelKey: "settings.sections.privacy" },
  { id: "accessibility", labelKey: "settings.sections.accessibility" },
  { id: "about", labelKey: "settings.sections.about" },
];

export function Settings({ initialState }: AppComponentProps) {
  const { t } = useTranslation();
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
      case "language":
        return <LanguagePanel />;
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
          <span className={styles.headerTitle}>{t('settings.title')}</span>
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
              <span className={styles.sidebarLabel}>{t(section.labelKey)}</span>
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
