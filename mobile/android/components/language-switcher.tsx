import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useLocaleStore, getAvailableLanguages } from '@/stores/locale-store';
import type { LanguageCode } from '@/lib/i18n';

interface LanguageSwitcherProps {
  /** Compact mode shows just flags/codes in a row */
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const language = useLocaleStore((state) => state.language);
  const setLanguage = useLocaleStore((state) => state.setLanguage);
  
  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const inactiveColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');

  const languages = getAvailableLanguages();

  const handleLanguageSelect = (code: LanguageCode) => {
    if (code !== language) {
      setLanguage(code);
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {languages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <Pressable
              key={lang.code}
              style={[
                styles.compactOption,
                { 
                  backgroundColor: isSelected ? primaryColor : 'transparent',
                  borderColor: isSelected ? primaryColor : borderColor,
                },
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
            >
              <ThemedText
                style={[
                  styles.compactText,
                  { color: isSelected ? '#FFFFFF' : inactiveColor },
                ]}
              >
                {lang.code.toUpperCase()}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>{t('settings.language')}</ThemedText>
      <View style={[styles.optionsContainer, { backgroundColor: cardBg, borderColor }]}>
        {languages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <Pressable
              key={lang.code}
              style={[
                styles.option,
                isSelected && { backgroundColor: primaryColor },
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
            >
              <ThemedText
                style={[
                  styles.languageName,
                  { color: isSelected ? '#FFFFFF' : undefined },
                ]}
              >
                {lang.nativeName}
              </ThemedText>
              <ThemedText
                style={[
                  styles.languageEnglish,
                  { color: isSelected ? 'rgba(255,255,255,0.8)' : inactiveColor },
                ]}
              >
                {lang.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageEnglish: {
    fontSize: 14,
  },
  compactContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  compactOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
