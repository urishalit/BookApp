import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MemberCard } from '@/components/member-card';
import { MemberAvatar } from '@/components/member-avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFamily, useMemberOperations } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Member } from '@/types/models';

export default function FamilyScreen() {
  const router = useRouter();
  const {
    family,
    members,
    selectedMemberId,
    setSelectedMemberId,
    isLoading,
    error,
  } = useFamily();
  const { removeMember } = useMemberOperations();
  
  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1A2129' }, 'background');

  const handleSelectMember = useCallback(
    (memberId: string) => {
      setSelectedMemberId(memberId === selectedMemberId ? null : memberId);
    },
    [selectedMemberId, setSelectedMemberId]
  );

  const handleEditMember = useCallback(
    (member: Member) => {
      router.push({
        pathname: '/member/[id]',
        params: { id: member.id },
      });
    },
    [router]
  );

  const handleDeleteMember = useCallback(
    (member: Member) => {
      Alert.alert(
        'Delete Member',
        `Are you sure you want to delete "${member.name}"? This will also delete all their books.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMember(member.id, member.avatarUrl);
                // Clear selection if deleted member was selected
                if (selectedMemberId === member.id) {
                  setSelectedMemberId(null);
                }
              } catch (err) {
                Alert.alert('Error', 'Failed to delete member');
              }
            },
          },
        ]
      );
    },
    [removeMember, selectedMemberId, setSelectedMemberId]
  );

  const handleAddMember = useCallback(() => {
    router.push('/member/create');
  }, [router]);

  const renderMember = useCallback(
    ({ item }: { item: Member }) => (
      <MemberCard
        member={item}
        isSelected={item.id === selectedMemberId}
        onPress={() => handleSelectMember(item.id)}
        onLongPress={() => handleEditMember(item)}
      />
    ),
    [selectedMemberId, handleSelectMember, handleEditMember]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
        <IconSymbol name="person.3.fill" size={64} color={primaryColor} />
      </View>
      <ThemedText type="title" style={styles.emptyTitle}>
        No Family Members Yet
      </ThemedText>
      <ThemedText style={styles.emptyText}>
        Add your first family member to start tracking their books!
      </ThemedText>
      <Pressable
        style={[styles.emptyButton, { backgroundColor: primaryColor }]}
        onPress={handleAddMember}
      >
        <IconSymbol name="plus" size={20} color="#FFFFFF" />
        <ThemedText style={styles.emptyButtonText}>Add First Member</ThemedText>
      </Pressable>
    </View>
  );

  if (isLoading && members.length === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>Loading family...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#E57373" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText type="title" style={styles.headerTitle}>
            {family?.name ?? 'Family'}
          </ThemedText>
          <ThemedText style={styles.memberCount}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </ThemedText>
        </View>
        <Pressable
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={handleAddMember}
        >
          <IconSymbol name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Selected Member Quick Actions */}
      {selectedMemberId && (
        <View style={[styles.selectedBar, { backgroundColor: cardBg }]}>
          {(() => {
            const member = members.find((m) => m.id === selectedMemberId);
            if (!member) return null;
            return (
              <>
                <MemberAvatar
                  name={member.name}
                  color={member.color}
                  avatarUrl={member.avatarUrl}
                  size="small"
                />
                <ThemedText style={styles.selectedName} numberOfLines={1}>
                  {member.name}
                </ThemedText>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleEditMember(member)}
                >
                  <IconSymbol name="pencil" size={20} color={primaryColor} />
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleDeleteMember(member)}
                >
                  <IconSymbol name="trash" size={20} color="#E57373" />
                </Pressable>
              </>
            );
          })()}
        </View>
      )}

      {/* Members List */}
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          members.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
  },
  memberCount: {
    opacity: 0.6,
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedName: {
    flex: 1,
    marginLeft: 12,
    fontWeight: '600',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

