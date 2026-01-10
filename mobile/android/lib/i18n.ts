import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import en from '@/locales/en.json';
import he from '@/locales/he.json';

// Available languages
export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false },
  he: { name: 'Hebrew', nativeName: 'עברית', rtl: true },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

/**
 * Get the device's preferred locale, falling back to 'en' if not supported.
 */
export function getDeviceLocale(): LanguageCode {
  try {
    // Dynamic import to handle cases where native module isn't available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require('expo-localization');
    const deviceLocales = Localization.getLocales();
    
    if (deviceLocales && deviceLocales.length > 0) {
      const primaryLocale = deviceLocales[0].languageCode;
      if (primaryLocale && primaryLocale in LANGUAGES) {
        return primaryLocale as LanguageCode;
      }
    }
  } catch (error) {
    // Native module not available (e.g., in Expo Go or before rebuild)
    console.warn('expo-localization not available, defaulting to English');
  }
  
  return 'en';
}

/**
 * Check if a language is RTL.
 */
export function isRTL(language: LanguageCode): boolean {
  return LANGUAGES[language].rtl;
}

/**
 * Apply RTL settings for a language.
 * Note: RTL changes may require an app restart to take full effect.
 */
export function applyRTL(language: LanguageCode): void {
  const shouldBeRTL = isRTL(language);
  
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
}

// Initialize i18next
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: getDeviceLocale(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  react: {
    useSuspense: false, // Disable suspense for React Native compatibility
  },
});

// Apply RTL on initial load
applyRTL(i18n.language as LanguageCode);

// Listen for language changes and apply RTL
i18n.on('languageChanged', (lng) => {
  if (lng in LANGUAGES) {
    applyRTL(lng as LanguageCode);
  }
});

export default i18n;
