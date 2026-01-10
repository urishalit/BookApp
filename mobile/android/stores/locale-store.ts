import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import i18n, { LanguageCode, LANGUAGES, isRTL, applyRTL, getDeviceLocale } from '@/lib/i18n';

interface LocaleState {
  /** The currently selected language code */
  language: LanguageCode;
  /** Whether the initial language has been determined */
  isInitialized: boolean;
  
  /** Set the app language */
  setLanguage: (language: LanguageCode) => void;
  /** Reset to device locale */
  resetToDeviceLocale: () => void;
}

// In-memory fallback storage when AsyncStorage isn't available
const memoryStorage: Record<string, string> = {};
const fallbackStorage = {
  getItem: (name: string) => Promise.resolve(memoryStorage[name] ?? null),
  setItem: (name: string, value: string) => {
    memoryStorage[name] = value;
    return Promise.resolve();
  },
  removeItem: (name: string) => {
    delete memoryStorage[name];
    return Promise.resolve();
  },
};

// Try to get AsyncStorage, fall back to memory storage if not available
function getStorage() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  } catch (error) {
    console.warn('AsyncStorage not available, using in-memory storage for locale');
    return fallbackStorage;
  }
}

const storeCreator: StateCreator<LocaleState> = (set, get) => ({
  language: getDeviceLocale(),
  isInitialized: false,

  setLanguage: (language: LanguageCode) => {
    // Update i18n language
    i18n.changeLanguage(language);
    
    // Update store
    set({ language });
    
    // Apply RTL settings
    applyRTL(language);
  },

  resetToDeviceLocale: () => {
    const deviceLocale = getDeviceLocale();
    get().setLanguage(deviceLocale);
  },
});

const persistOptions: PersistOptions<LocaleState, Pick<LocaleState, 'language'>> = {
  name: 'locale-storage',
  storage: createJSONStorage(() => getStorage()),
  partialize: (state) => ({ language: state.language }),
  onRehydrateStorage: () => (state) => {
    if (state) {
      // After rehydration, sync i18n with stored language
      i18n.changeLanguage(state.language);
      applyRTL(state.language);
      state.isInitialized = true;
    }
  },
};

export const useLocaleStore = create<LocaleState>()(
  persist(storeCreator, persistOptions)
);

// Export helper hooks and utilities
export const useLanguage = () => useLocaleStore((state) => state.language);
export const useSetLanguage = () => useLocaleStore((state) => state.setLanguage);
export const useIsRTL = () => isRTL(useLocaleStore((state) => state.language));

// Export language list for UI
export const getAvailableLanguages = () => 
  Object.entries(LANGUAGES).map(([code, info]) => ({
    code: code as LanguageCode,
    ...info,
  }));
