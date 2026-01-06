import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStateListener, useAuth } from '@/hooks/use-auth';
import { configureGoogleSignIn } from '@/lib/google-signin';

// Configure Google Sign-In
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

// Custom dark theme with book-keeper colors
const BookKeeperDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#D4A574',
    background: '#0F1419',
    card: '#1A2129',
    text: '#F5E6D3',
    border: '#2D3748',
    notification: '#D4A574',
  },
};

const BookKeeperLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8B5A2B',
    background: '#FDF8F3',
    card: '#FFFFFF',
    text: '#2D1810',
    border: '#E5D4C0',
    notification: '#8B5A2B',
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthNavigator() {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, segments, router]);

  // Show loading screen while initializing
  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A574" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="member" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // Configure Google Sign-In on mount
  useEffect(() => {
    if (WEB_CLIENT_ID) {
      configureGoogleSignIn(WEB_CLIENT_ID);
    }
  }, []);
  
  // Initialize auth state listener
  useAuthStateListener();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? BookKeeperDark : BookKeeperLight}>
      <AuthNavigator />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1419',
  },
});
