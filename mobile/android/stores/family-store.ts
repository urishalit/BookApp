import { create } from 'zustand';
import type { Family, Member } from '@/types/models';

interface FamilyState {
  family: Family | null;
  members: Member[];
  selectedMemberId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setFamily: (family: Family | null) => void;
  setMembers: (members: Member[]) => void;
  setSelectedMemberId: (memberId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  family: null,
  members: [],
  selectedMemberId: null,
  isLoading: false,
  error: null,
};

export const useFamilyStore = create<FamilyState>((set) => ({
  ...initialState,

  setFamily: (family) => set({ family }),
  setMembers: (members) => set({ members }),
  setSelectedMemberId: (selectedMemberId) => set({ selectedMemberId }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState),
}));

// Selector for getting selected member (non-hook version for direct access)
export const getSelectedMember = () => {
  const { members, selectedMemberId } = useFamilyStore.getState();
  return members.find((m) => m.id === selectedMemberId) ?? null;
};

// Hook version for use in React components
export const useSelectedMember = () => {
  const members = useFamilyStore((s) => s.members);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);
  return members.find((m) => m.id === selectedMemberId) ?? null;
};

