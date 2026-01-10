import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LanguageSwitcher } from '@/components/language-switcher';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth-store';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const dangerColor = '#E57373';

  const handleSignOut = useCallback(() => {
    Alert.alert(
      t('settings.signOut'),
      t('settings.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will happen automatically via auth state listener
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert(t('common.error'), t('errors.generic'));
            }
          },
        },
      ]
    );
  }, [signOut, t]);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          {t('settings.title')}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Section */}
        <View style={styles.section}>
          <LanguageSwitcher />
        </View>

        {/* Sign Out Section */}
        <View style={styles.section}>
          <Pressable
            style={[styles.signOutButton, { backgroundColor: cardBg, borderColor }]}
            onPress={handleSignOut}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={22} color={dangerColor} />
            <ThemedText style={[styles.signOutText, { color: dangerColor }]}>
              {t('settings.signOut')}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

