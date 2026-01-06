import { useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Hook to initialize Firebase auth state listener.
 * Should be called once in the root layout.
 */
export function useAuthStateListener() {
  const { setUser, setInitialized, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    
    // Using the modular API
    const unsubscribe = auth().onAuthStateChanged((user: FirebaseAuthTypes.User | null) => {
      setUser(user);
      setInitialized(true);
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setInitialized, setLoading]);
}

/**
 * Hook to access auth state.
 */
export function useAuth() {
  const { user, isLoading, isInitialized, error } = useAuthStore();

  return {
    user,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
    error,
  };
}
