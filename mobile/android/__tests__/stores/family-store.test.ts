import { useFamilyStore, getSelectedMember } from '../../stores/family-store';
import type { Family, Member } from '../../types/models';

describe('Family Store', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useFamilyStore.setState({
      family: null,
      members: [],
      selectedMemberId: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useFamilyStore.getState();

      expect(state.family).toBeNull();
      expect(state.members).toEqual([]);
      expect(state.selectedMemberId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('State Setters', () => {
    it('should set family correctly', () => {
      const mockFamily: Family = {
        id: 'family-123',
        name: 'Test Family',
        ownerId: 'user-456',
        createdAt: { toDate: () => new Date() } as any,
      };

      useFamilyStore.getState().setFamily(mockFamily);

      expect(useFamilyStore.getState().family).toEqual(mockFamily);
    });

    it('should set members correctly', () => {
      const mockMembers: Member[] = [
        { id: 'member-1', familyId: 'family-123', name: 'Alice', color: '#FF0000' },
        { id: 'member-2', familyId: 'family-123', name: 'Bob', color: '#00FF00' },
      ];

      useFamilyStore.getState().setMembers(mockMembers);

      expect(useFamilyStore.getState().members).toEqual(mockMembers);
      expect(useFamilyStore.getState().members).toHaveLength(2);
    });

    it('should set selected member ID correctly', () => {
      useFamilyStore.getState().setSelectedMemberId('member-123');

      expect(useFamilyStore.getState().selectedMemberId).toBe('member-123');
    });

    it('should clear selected member ID when set to null', () => {
      useFamilyStore.getState().setSelectedMemberId('member-123');
      useFamilyStore.getState().setSelectedMemberId(null);

      expect(useFamilyStore.getState().selectedMemberId).toBeNull();
    });

    it('should set loading state', () => {
      useFamilyStore.getState().setLoading(true);
      expect(useFamilyStore.getState().isLoading).toBe(true);

      useFamilyStore.getState().setLoading(false);
      expect(useFamilyStore.getState().isLoading).toBe(false);
    });

    it('should set and clear error', () => {
      useFamilyStore.getState().setError('Test error message');
      expect(useFamilyStore.getState().error).toBe('Test error message');

      useFamilyStore.getState().clearError();
      expect(useFamilyStore.getState().error).toBeNull();
    });
  });

  describe('Reset', () => {
    it('should reset all state to initial values', () => {
      // Set some state
      useFamilyStore.setState({
        family: { id: 'f1', name: 'Family', ownerId: 'o1', createdAt: {} as any },
        members: [{ id: 'm1', familyId: 'f1', name: 'Member', color: '#000' }],
        selectedMemberId: 'm1',
        isLoading: true,
        error: 'Some error',
      });

      useFamilyStore.getState().reset();

      const state = useFamilyStore.getState();
      expect(state.family).toBeNull();
      expect(state.members).toEqual([]);
      expect(state.selectedMemberId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('getSelectedMember selector', () => {
    it('should return the selected member when one is selected', () => {
      const mockMembers: Member[] = [
        { id: 'member-1', familyId: 'family-123', name: 'Alice', color: '#FF0000' },
        { id: 'member-2', familyId: 'family-123', name: 'Bob', color: '#00FF00' },
      ];

      useFamilyStore.setState({
        members: mockMembers,
        selectedMemberId: 'member-2',
      });

      const selected = getSelectedMember();

      expect(selected).not.toBeNull();
      expect(selected?.id).toBe('member-2');
      expect(selected?.name).toBe('Bob');
    });

    it('should return null when no member is selected', () => {
      const mockMembers: Member[] = [
        { id: 'member-1', familyId: 'family-123', name: 'Alice', color: '#FF0000' },
      ];

      useFamilyStore.setState({
        members: mockMembers,
        selectedMemberId: null,
      });

      const selected = getSelectedMember();

      expect(selected).toBeNull();
    });

    it('should return null when selected ID does not match any member', () => {
      const mockMembers: Member[] = [
        { id: 'member-1', familyId: 'family-123', name: 'Alice', color: '#FF0000' },
      ];

      useFamilyStore.setState({
        members: mockMembers,
        selectedMemberId: 'non-existent-id',
      });

      const selected = getSelectedMember();

      expect(selected).toBeNull();
    });
  });
});

