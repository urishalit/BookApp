import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth-store';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signInWithGoogle, isLoading, error, clearError } = useAuthStore();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      // Error is handled in the store
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Language Switcher */}
        <View style={styles.languageSwitcher}>
          <LanguageSwitcher compact />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>📚</Text>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>

        {/* Sign In Section */}
        <View style={styles.signInSection}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Text style={styles.dismissError}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F1419" />
            ) : (
              <View style={styles.googleButtonContent}>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>{t('auth.continueWithGoogle')}</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>
            {t('auth.termsText')}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('auth.footerText')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  languageSwitcher: {
    position: 'absolute',
    top: 60,
    right: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logo: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F5E6D3',
    marginBottom: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#8B9EB3',
    textAlign: 'center',
  },
  signInSection: {
    marginBottom: 48,
  },
  errorContainer: {
    backgroundColor: '#4A1515',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#7A2525',
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  dismissError: {
    color: '#F87171',
    fontSize: 18,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  termsText: {
    marginTop: 20,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#8B9EB3',
    fontStyle: 'italic',
  },
});
