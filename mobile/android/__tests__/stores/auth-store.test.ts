import { useAuthStore } from '../../stores/auth-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

describe('Auth Store', () => {
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    // Reset the store state before each test
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
    jest.clearAllMocks();
    // Silence expected console output during tests
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('State Setters', () => {
    it('should set user correctly', () => {
      const mockUser = { uid: 'test-123', email: 'test@test.com' } as any;
      
      useAuthStore.getState().setUser(mockUser);
      
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should set loading state', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set initialized state', () => {
      useAuthStore.getState().setInitialized(true);
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it('should set and clear error', () => {
      useAuthStore.getState().setError('Test error');
      expect(useAuthStore.getState().error).toBe('Test error');
      
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('signInWithGoogle', () => {
    it('should sign in successfully with Google', async () => {
      await useAuthStore.getState().signInWithGoogle();
      
      expect(GoogleSignin.hasPlayServices).toHaveBeenCalled();
      expect(GoogleSignin.signIn).toHaveBeenCalled();
      expect(auth().signInWithCredential).toHaveBeenCalled();
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should handle sign in cancellation', async () => {
      const cancelError = { code: 'SIGN_IN_CANCELLED', message: 'Cancelled' };
      (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(cancelError);
      
      await expect(useAuthStore.getState().signInWithGoogle()).rejects.toEqual(cancelError);
      
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().error).toBe('Sign in was cancelled');
    });

    it('should handle Play Services unavailable', async () => {
      const psError = { code: 'PLAY_SERVICES_NOT_AVAILABLE', message: 'No Play Services' };
      (GoogleSignin.hasPlayServices as jest.Mock).mockRejectedValueOnce(psError);
      
      await expect(useAuthStore.getState().signInWithGoogle()).rejects.toEqual(psError);
      
      expect(useAuthStore.getState().error).toBe('Google Play Services not available');
    });

    it('should prevent multiple simultaneous sign-in attempts', async () => {
      // Set loading to true to simulate in-progress sign-in
      useAuthStore.setState({ isLoading: true });
      
      await useAuthStore.getState().signInWithGoogle();
      
      // Should not have called signIn because one was already in progress
      expect(GoogleSignin.signIn).not.toHaveBeenCalled();
    });

    it('should handle missing ID token', async () => {
      (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
        data: { idToken: null },
      });
      
      await expect(useAuthStore.getState().signInWithGoogle()).rejects.toThrow(
        'No ID token received from Google Sign-In'
      );
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      // Set a user first
      useAuthStore.setState({ user: { uid: 'test' } as any });
      
      await useAuthStore.getState().signOut();
      
      expect(GoogleSignin.signOut).toHaveBeenCalled();
      expect(auth().signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle sign out errors', async () => {
      (auth().signOut as jest.Mock).mockRejectedValueOnce(new Error('Sign out failed'));
      
      await expect(useAuthStore.getState().signOut()).rejects.toThrow('Sign out failed');
      
      expect(useAuthStore.getState().error).toBe('Sign out failed');
    });
  });
});

