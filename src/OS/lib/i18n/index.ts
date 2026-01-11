/**
 * Internationalization Module
 * Exports all i18n utilities and components
 */

export { 
  locales, 
  defaultLocale, 
  localeNames, 
  detectLocale, 
  setLocale, 
  isRtl,
  type Locale 
} from './config';

export { 
  TranslationProvider, 
  useTranslation, 
  useLocale 
} from './TranslationProvider';

export { useContentTranslation } from './useContentTranslation';
export { TranslatedContent, TranslatedText } from './TranslatedContent';
