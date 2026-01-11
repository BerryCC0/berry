/**
 * Internationalization Configuration
 * Defines supported locales and translation settings
 */

export const defaultLocale = 'en' as const;

// Only languages with full message file support
export const locales = [
  'en',  // English
  'es',  // Spanish
  'pt',  // Portuguese
  'de',  // German
  'ja',  // Japanese
  'zh',  // Chinese (Simplified)
  'ko',  // Korean
] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
};

// RTL languages (none in current supported set)
export const rtlLocales: Locale[] = [];

/**
 * Detect user's preferred locale from browser
 */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return defaultLocale;
  
  // Check for stored preference first
  const stored = localStorage.getItem('berry-locale');
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale;
  }
  
  // Check navigator.languages (array of preferred languages)
  const browserLocales = navigator.languages || [navigator.language];
  
  for (const lang of browserLocales) {
    // Try exact match first (e.g., 'pt-BR' -> 'pt')
    const base = lang.split('-')[0].toLowerCase();
    if (locales.includes(base as Locale)) {
      return base as Locale;
    }
  }
  
  return defaultLocale;
}

/**
 * Save locale preference
 */
export function setLocale(locale: Locale): void {
  localStorage.setItem('berry-locale', locale);
  // Trigger a re-render by dispatching a custom event
  window.dispatchEvent(new CustomEvent('locale-change', { detail: locale }));
}

/**
 * Check if a locale is RTL
 */
export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
