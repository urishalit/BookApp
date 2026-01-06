import { useEffect, useCallback } from 'react';
import { useFamilyStore } from '@/stores/family-store';
import { useAuthStore } from '@/stores/auth-store';
import {
  createFamily,
  getFamilyByOwner,
  createMember,
  updateMember,
  deleteMember,
  onMembersSnapshot,
} from '@/lib/firestore';
import { uploadMemberAvatar, deleteFile } from '@/lib/storage';
import type { Member } from '@/types/models';

/**
 * Hook to initialize and manage family data.
 * Should be called in the authenticated app layout.
 */
export function useFamilyListener() {
  const user = useAuthStore((s) => s.user);
  const { setFamily, setMembers, setLoading, setError } = useFamilyStore();

  useEffect(() => {
    if (!user) {
      // Reset family state when user logs out
      useFamilyStore.getState().reset();
      return;
    }

    let unsubscribeMembers: (() => void) | null = null;

    async function initializeFamily() {
      setLoading(true);
      setError(null);

      try {
        // Check if user already has a family
        let family = await getFamilyByOwner(user!.uid);

        if (!family) {
          // Create a new family for the user
          const familyName = user!.displayName
            ? `${user!.displayName}'s Family`
            : 'My Family';
          const familyId = await createFamily({
            name: familyName,
            ownerId: user!.uid,
          });
          family = {
            id: familyId,
            name: familyName,
            ownerId: user!.uid,
            createdAt: null as any, // Will be set by server
          };
        }

        setFamily(family);

        // Subscribe to members updates
        unsubscribeMembers = onMembersSnapshot(family.id, (members) => {
          setMembers(members);
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load family';
        setError(message);
        console.error('Family initialization error:', error);
      } finally {
        setLoading(false);
      }
    }

    initializeFamily();

    return () => {
      unsubscribeMembers?.();
    };
  }, [user, setFamily, setMembers, setLoading, setError]);
}

/**
 * Hook for family member CRUD operations
 */
export function useMemberOperations() {
  const family = useFamilyStore((s) => s.family);

  const addMember = useCallback(
    async (data: { name: string; color: string; avatarUri?: string }) => {
      if (!family) throw new Error('No family loaded');

      // Create the member first to get the ID
      const memberId = await createMember(family.id, {
        name: data.name,
        color: data.color,
      });

      // If there's an avatar, upload it
      if (data.avatarUri) {
        try {
          const avatarUrl = await uploadMemberAvatar(
            data.avatarUri,
            family.id,
            memberId
          );
          await updateMember(family.id, memberId, { avatarUrl });
        } catch (error) {
          console.error('Failed to upload avatar:', error);
          // Continue without avatar - member was created successfully
        }
      }

      return memberId;
    },
    [family]
  );

  const editMember = useCallback(
    async (
      memberId: string,
      data: { name?: string; color?: string; avatarUri?: string },
      currentAvatarUrl?: string
    ) => {
      if (!family) throw new Error('No family loaded');

      const updateData: Partial<Member> = {};

      if (data.name !== undefined) {
        updateData.name = data.name;
      }

      if (data.color !== undefined) {
        updateData.color = data.color;
      }

      // Handle avatar update
      if (data.avatarUri) {
        try {
          // Delete old avatar if exists
          if (currentAvatarUrl) {
            await deleteFile(currentAvatarUrl);
          }

          const avatarUrl = await uploadMemberAvatar(
            data.avatarUri,
            family.id,
            memberId
          );
          updateData.avatarUrl = avatarUrl;
        } catch (error) {
          console.error('Failed to update avatar:', error);
          // Continue with other updates
        }
      }

      if (Object.keys(updateData).length > 0) {
        await updateMember(family.id, memberId, updateData);
      }
    },
    [family]
  );

  const removeMember = useCallback(
    async (memberId: string, avatarUrl?: string) => {
      if (!family) throw new Error('No family loaded');

      // Delete avatar if exists
      if (avatarUrl) {
        try {
          await deleteFile(avatarUrl);
        } catch (error) {
          console.error('Failed to delete avatar:', error);
        }
      }

      await deleteMember(family.id, memberId);
    },
    [family]
  );

  return {
    addMember,
    editMember,
    removeMember,
  };
}

/**
 * Hook for accessing family state
 */
export function useFamily() {
  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);
  const isLoading = useFamilyStore((s) => s.isLoading);
  const error = useFamilyStore((s) => s.error);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);
  const setSelectedMemberId = useFamilyStore((s) => s.setSelectedMemberId);

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;

  return {
    family,
    members,
    selectedMember,
    selectedMemberId,
    setSelectedMemberId,
    isLoading,
    error,
  };
}

