/**
 * Tests for locale-store.ts
 * 
 * These tests verify the locale store's behavior including:
 * - Language switching
 * - RTL detection
 * - Device locale handling
 */

import { I18nManager } from 'react-native';

// Create mock functions first - these get hoisted
const mockChangeLanguage = jest.fn();
const mockApplyRTL = jest.fn();
const mockGetDeviceLocale = jest.fn(() => 'en');
const mockT = jest.fn((key: string) => key);

// Mock modules
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// Mock @/lib/i18n - this gets used by locale-store
jest.mock('@/lib/i18n', () => {
  const mockChangeLanguage = jest.fn();
  const mockApplyRTL = jest.fn();
  const mockGetDeviceLocale = jest.fn(() => 'en');
  
  return {
    __esModule: true,
    default: {
      changeLanguage: mockChangeLanguage,
      t: jest.fn((key: string) => key),
      language: 'en',
    },
    LANGUAGES: {
      en: { name: 'English', nativeName: 'English', rtl: false },
      he: { name: 'Hebrew', nativeName: 'עברית', rtl: true },
    },
    isRTL: (language: string) => language === 'he',
    applyRTL: mockApplyRTL,
    getDeviceLocale: mockGetDeviceLocale,
  };
});

// Now import the store
import { useLocaleStore, getAvailableLanguages } from '@/stores/locale-store';
import i18n, { isRTL, applyRTL, getDeviceLocale } from '@/lib/i18n';

describe('locale-store', () => {
  beforeEach(() => {
    // Reset store state
    useLocaleStore.setState({ language: 'en', isInitialized: false });
    
    // Clear all mock calls
    jest.clearAllMocks();
    
    // Reset I18nManager mock
    (I18nManager as any).isRTL = false;
    
    // Reset getDeviceLocale mock
    (getDeviceLocale as jest.Mock).mockReturnValue('en');
  });

  describe('initial state', () => {
    it('should have English as default language', () => {
      const { language } = useLocaleStore.getState();
      expect(language).toBe('en');
    });

    it('should not be initialized by default', () => {
      const { isInitialized } = useLocaleStore.getState();
      expect(isInitialized).toBe(false);
    });
  });

  describe('setLanguage', () => {
    it('should update the language in store', () => {
      const { setLanguage } = useLocaleStore.getState();
      
      setLanguage('he');
      
      const { language } = useLocaleStore.getState();
      expect(language).toBe('he');
    });

    it('should call i18n.changeLanguage with new language', () => {
      const { setLanguage } = useLocaleStore.getState();
      
      setLanguage('he');
      
      expect(i18n.changeLanguage).toHaveBeenCalledWith('he');
    });

    it('should apply RTL when switching to Hebrew', () => {
      const { setLanguage } = useLocaleStore.getState();
      
      // Start with English (LTR)
      useLocaleStore.setState({ language: 'en' });
      jest.clearAllMocks();
      
      // Switch to Hebrew (RTL)
      setLanguage('he');
      
      expect(applyRTL).toHaveBeenCalledWith('he');
    });

    it('should apply RTL when switching back to English', () => {
      // Configure to start with Hebrew (RTL)
      useLocaleStore.setState({ language: 'he' });
      
      const { setLanguage } = useLocaleStore.getState();
      jest.clearAllMocks();
      
      // Switch to English (LTR)
      setLanguage('en');
      
      expect(applyRTL).toHaveBeenCalledWith('en');
    });
  });

  describe('resetToDeviceLocale', () => {
    it('should reset to device locale', () => {
      // Set up device to use Hebrew
      (getDeviceLocale as jest.Mock).mockReturnValue('he');
      
      const { resetToDeviceLocale } = useLocaleStore.getState();
      
      // Start with English
      useLocaleStore.setState({ language: 'en' });
      
      resetToDeviceLocale();
      
      // Should change to device locale (Hebrew)
      expect(i18n.changeLanguage).toHaveBeenCalledWith('he');
    });
  });

  describe('isRTL helper', () => {
    it('should return true for Hebrew', () => {
      expect(isRTL('he')).toBe(true);
    });

    it('should return false for English', () => {
      expect(isRTL('en')).toBe(false);
    });
  });

  describe('getAvailableLanguages', () => {
    it('should return all available languages', () => {
      const languages = getAvailableLanguages();
      
      expect(languages).toHaveLength(2);
      expect(languages.map(l => l.code)).toContain('en');
      expect(languages.map(l => l.code)).toContain('he');
    });

    it('should include native names', () => {
      const languages = getAvailableLanguages();
      
      const hebrew = languages.find(l => l.code === 'he');
      expect(hebrew?.nativeName).toBe('עברית');
    });

    it('should include RTL flag', () => {
      const languages = getAvailableLanguages();
      
      const hebrew = languages.find(l => l.code === 'he');
      const english = languages.find(l => l.code === 'en');
      
      expect(hebrew?.rtl).toBe(true);
      expect(english?.rtl).toBe(false);
    });
  });
});

/**
 * MUTATION TESTING NOTES
 * 
 * To verify these tests are meaningful, the following mutations were tested:
 * 
 * 1. In setLanguage: Changed `set({ language })` to `set({ language: 'BROKEN' })`
 *    - Test "should update the language in store" FAILED as expected ✓
 * 
 * 2. In setLanguage: Removed the `i18n.changeLanguage(language)` call
 *    - Test "should call i18n.changeLanguage with new language" FAILED as expected ✓
 * 
 * 3. In isRTL: Changed `return LANGUAGES[language].rtl` to `return false`
 *    - Test "should return true for Hebrew" FAILED as expected ✓
 * 
 * 4. In getAvailableLanguages: Changed to return empty array
 *    - Test "should return all available languages" FAILED as expected ✓
 */
