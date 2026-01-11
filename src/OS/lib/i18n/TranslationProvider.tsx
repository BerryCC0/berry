/**
 * Translation Provider
 * Provides translation context to all components
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { type Locale, defaultLocale, detectLocale, setLocale as saveLocale, isRtl } from './config';
import { onLocaleChange } from './useContentTranslation';

// Import all translation files
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import pt from '@/messages/pt.json';
import de from '@/messages/de.json';
import ja from '@/messages/ja.json';
import zh from '@/messages/zh.json';
import ko from '@/messages/ko.json';

type TranslationMessages = typeof en;

const messages: Record<string, TranslationMessages> = {
  en,
  es,
  pt,
  de,
  ja,
  zh,
  ko,
};

interface TranslationContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRtl: boolean;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolate variables in a translation string
 * Supports {variable} syntax
 */
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  
  return str.replace(/{(\w+)}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  // Detect locale on mount
  useEffect(() => {
    const detected = detectLocale();
    setLocaleState(detected);
    setMounted(true);
  }, []);

  // Listen for locale changes
  useEffect(() => {
    const handleLocaleChange = (e: CustomEvent<Locale>) => {
      setLocaleState(e.detail);
    };

    window.addEventListener('locale-change', handleLocaleChange as EventListener);
    return () => {
      window.removeEventListener('locale-change', handleLocaleChange as EventListener);
    };
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    // Clear translation queue before changing locale
    onLocaleChange();
    saveLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  // The t function - always uses current locale state
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const currentMessages = messages[locale] || messages[defaultLocale];
    const value = getNestedValue(currentMessages as Record<string, unknown>, key);
    
    if (!value) {
      // Fall back to English
      const fallback = getNestedValue(messages[defaultLocale] as Record<string, unknown>, key);
      if (fallback) {
        return interpolate(fallback, params);
      }
      // Return the key as last resort (helps identify missing translations)
      if (typeof window !== 'undefined') {
        console.warn(`Missing translation: ${key}`);
      }
      return key;
    }
    
    return interpolate(value, params);
  }, [locale]);

  const contextValue = useMemo(() => ({
    locale,
    setLocale,
    t,
    isRtl: isRtl(locale),
  }), [locale, setLocale, t]);

  // Always render with context - use default locale until mounted
  // This ensures components always have access to the context
  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * Hook to access translations
 */
export function useTranslation() {
  const context = useContext(TranslationContext);
  
  if (!context) {
    // Return a fallback during SSR or if provider is missing
    return {
      locale: defaultLocale,
      setLocale: () => {},
      t: (key: string) => key,
      isRtl: false,
    };
  }
  
  return context;
}

/**
 * Hook to get current locale
 */
export function useLocale(): Locale {
  const { locale } = useTranslation();
  return locale;
}
