/**
 * Tests for use-family hook
 *
 * Covers:
 * - useFamily's setSelectedMemberId persists to AsyncStorage
 * - useFamilyListener restores selected member from storage when members load
 * - useFamilyListener falls back to first member when stored ID is invalid
 *
 * Mutation testing verified:
 * - setSelectedMemberId persistence: Commenting out AsyncStorage.setItem causes
 *   "should persist selected member to AsyncStorage when family exists" to fail
 * - Fallback logic: Returning members[1].id instead of members[0].id when stored
 *   is invalid causes "should fall back to first member when stored ID is invalid" to fail
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFamilyStore } from '@/stores/family-store';
import type { Family, Member } from '@/types/models';

jest.mock('@/lib/firestore', () => ({
  createFamily: jest.fn(() => Promise.resolve('family-123')),
  getFamilyByOwner: jest.fn(() =>
    Promise.resolve({
      id: 'family-123',
      name: 'Test Family',
      ownerId: 'user-123',
      createdAt: null,
    })
  ),
  createMember: jest.fn(() => Promise.resolve('member-new')),
  updateMember: jest.fn(() => Promise.resolve()),
  deleteMember: jest.fn(() => Promise.resolve()),
  onMembersSnapshot: jest.fn(() => jest.fn()),
  getMembers: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@/lib/storage', () => ({
  uploadMemberAvatar: jest.fn(() => Promise.resolve('https://example.com/avatar.jpg')),
  deleteFile: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn((selector: (s: { user: { uid: string } | null }) => unknown) =>
    selector({ user: { uid: 'user-123' } })
  ),
}));

import { useFamily, useFamilyListener } from '@/hooks/use-family';
import * as firestore from '@/lib/firestore';

const mockFamily: Family = {
  id: 'family-123',
  name: 'Test Family',
  ownerId: 'user-123',
  createdAt: null,
};

const mockMembers: Member[] = [
  { id: 'member-1', familyId: 'family-123', name: 'Alice', color: '#FF0000' },
  { id: 'member-2', familyId: 'family-123', name: 'Bob', color: '#00FF00' },
];

describe('useFamily', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFamilyStore.setState({
      family: mockFamily,
      members: mockMembers,
      selectedMemberId: 'member-1',
    });
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('setSelectedMemberId', () => {
    it('should update store when setSelectedMemberId is called', async () => {
      const { result } = renderHook(() => useFamily());

      await act(async () => {
        await result.current.setSelectedMemberId('member-2');
      });

      expect(useFamilyStore.getState().selectedMemberId).toBe('member-2');
    });

    it('should persist selected member to AsyncStorage when family exists', async () => {
      const { result } = renderHook(() => useFamily());

      await act(async () => {
        await result.current.setSelectedMemberId('member-2');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'selectedMember_family-123',
        'member-2'
      );
    });

    it('should persist empty string when setting null', async () => {
      useFamilyStore.setState({ family: mockFamily, members: [] });
      const { result } = renderHook(() => useFamily());

      await act(async () => {
        await result.current.setSelectedMemberId(null);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'selectedMember_family-123',
        ''
      );
    });

    it('should not throw when AsyncStorage.setItem fails', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useFamily());

      await act(async () => {
        await result.current.setSelectedMemberId('member-2');
      });

      expect(useFamilyStore.getState().selectedMemberId).toBe('member-2');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to persist selected member:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('selectedMember', () => {
    it('should return member matching selectedMemberId', () => {
      useFamilyStore.setState({
        family: mockFamily,
        members: mockMembers,
        selectedMemberId: 'member-2',
      });
      const { result } = renderHook(() => useFamily());

      expect(result.current.selectedMember).toEqual(mockMembers[1]);
      expect(result.current.selectedMember?.name).toBe('Bob');
    });

    it('should return null when selectedMemberId has no matching member', () => {
      useFamilyStore.setState({
        family: mockFamily,
        members: mockMembers,
        selectedMemberId: 'nonexistent',
      });
      const { result } = renderHook(() => useFamily());

      expect(result.current.selectedMember).toBeNull();
    });
  });
});

describe('useFamilyListener', () => {
  let membersCallback: (members: Member[]) => Promise<void>;

  beforeEach(() => {
    jest.clearAllMocks();
    useFamilyStore.setState({
      family: null,
      members: [],
      selectedMemberId: null,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    (firestore.onMembersSnapshot as jest.Mock).mockImplementation((_familyId: string, cb: (members: Member[]) => Promise<void>) => {
      membersCallback = cb;
      return jest.fn();
    });
  });

  it('should restore selected member from AsyncStorage when valid', async () => {
    renderHook(() => useFamilyListener());

    await act(async () => {
      await new Promise((r) => setImmediate(r));
    });

    expect(firestore.onMembersSnapshot).toHaveBeenCalledWith('family-123', expect.any(Function));
    membersCallback = (firestore.onMembersSnapshot as jest.Mock).mock.calls[0][1];

    await act(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('member-2');
      await membersCallback(mockMembers);
    });

    expect(useFamilyStore.getState().selectedMemberId).toBe('member-2');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'selectedMember_family-123',
      'member-2'
    );
  });

  it('should fall back to first member when stored ID is invalid', async () => {
    renderHook(() => useFamilyListener());

    await act(async () => {
      await new Promise((r) => setImmediate(r));
    });

    membersCallback = (firestore.onMembersSnapshot as jest.Mock).mock.calls[0][1];

    await act(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('deleted-member-id');
      await membersCallback(mockMembers);
    });

    expect(useFamilyStore.getState().selectedMemberId).toBe('member-1');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'selectedMember_family-123',
      'member-1'
    );
  });

  it('should use first member when AsyncStorage returns null', async () => {
    renderHook(() => useFamilyListener());

    await act(async () => {
      await new Promise((r) => setImmediate(r));
    });

    membersCallback = (firestore.onMembersSnapshot as jest.Mock).mock.calls[0][1];

    await act(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      await membersCallback(mockMembers);
    });

    expect(useFamilyStore.getState().selectedMemberId).toBe('member-1');
  });

  it('should set selectedMemberId to null when members array is empty', async () => {
    renderHook(() => useFamilyListener());

    await act(async () => {
      await new Promise((r) => setImmediate(r));
    });

    membersCallback = (firestore.onMembersSnapshot as jest.Mock).mock.calls[0][1];

    await act(async () => {
      await membersCallback([]);
    });

    expect(useFamilyStore.getState().selectedMemberId).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
