"use client";

/**
 * Language Settings Panel
 * Allows users to select their preferred language
 * All content is automatically translated based on this setting
 */

import { useCallback } from "react";
import { SettingRow, SettingGroup } from "../components/SettingRow";
import { Select } from "../components/Controls";
import { 
  useTranslation, 
  locales, 
  localeNames, 
  type Locale 
} from "@/OS/lib/i18n";
import styles from "./Panel.module.css";

// Convert locales to Select options
const languageOptions = locales.map((locale) => ({
  value: locale,
  label: localeNames[locale],
}));

export function LanguagePanel() {
  const { locale, setLocale, t } = useTranslation();

  const handleLanguageChange = useCallback((value: string) => {
    setLocale(value as Locale);
  }, [setLocale]);

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{t('settings.language.title')}</h2>

      <SettingGroup title={t('settings.language.selectLanguage')}>
        <SettingRow 
          label={t('settings.language.title')} 
          description={t('settings.language.autoTranslateDescription')}
        >
          <Select
            value={locale}
            options={languageOptions}
            onChange={handleLanguageChange}
          />
        </SettingRow>
      </SettingGroup>

      <div className={styles.languageInfo}>
        <p className={styles.infoText}>
          {locale === 'en' 
            ? 'All content will be displayed in English.'
            : `All proposals, candidates, and activity will be automatically translated to ${localeNames[locale as Locale]}.`
          }
        </p>
      </div>
    </div>
  );
}
