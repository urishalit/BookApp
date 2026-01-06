import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../../hooks/use-auth';
import { useAuthStore } from '../../stores/auth-store';

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  it('should return isAuthenticated as false when no user', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should return isAuthenticated as true when user exists', () => {
    const mockUser = { uid: 'test-123', email: 'test@test.com' } as any;
    useAuthStore.setState({ user: mockUser });
    
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should return loading state', () => {
    useAuthStore.setState({ isLoading: true });
    
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.isLoading).toBe(true);
  });

  it('should return initialized state', () => {
    useAuthStore.setState({ isInitialized: false });
    
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.isInitialized).toBe(false);
  });

  it('should return error state', () => {
    useAuthStore.setState({ error: 'Test error message' });
    
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.error).toBe('Test error message');
  });

  it('should update when store state changes', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.isAuthenticated).toBe(false);
    
    act(() => {
      useAuthStore.setState({ user: { uid: 'new-user' } as any });
    });
    
    expect(result.current.isAuthenticated).toBe(true);
  });
});

