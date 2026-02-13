import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MemberAvatar } from '@/components/member-avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFamily, useMemberOperations } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Member } from '@/types/models';

export default function FamilyManagementScreen() {
  const { t } = useTranslation();
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
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1A2129' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');

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
        t('family.deleteMember'),
        t('family.deleteMemberConfirm', { name: member.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMember(member.id, member.avatarUrl);
                if (selectedMemberId === member.id) {
                  const remaining = members.filter((m) => m.id !== member.id);
                  setSelectedMemberId(remaining[0]?.id ?? null);
                }
              } catch (err) {
                Alert.alert(t('common.error'), t('family.failedToDeleteMember'));
              }
            },
          },
        ]
      );
    },
    [removeMember, selectedMemberId, members, setSelectedMemberId, t]
  );

  const handleAddMember = useCallback(() => {
    router.push('/member/create');
  }, [router]);

  const renderMember = useCallback(
    ({ item }: { item: Member }) => (
      <View
        style={[styles.memberRow, { backgroundColor: cardBg, borderColor }]}
      >
        <MemberAvatar
          name={item.name}
          color={item.color}
          avatarUrl={item.avatarUrl}
          size="medium"
        />
        <ThemedText style={styles.memberName} numberOfLines={1}>
          {item.name}
        </ThemedText>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleEditMember(item)}
        >
          <IconSymbol name="pencil" size={20} color={primaryColor} />
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleDeleteMember(item)}
        >
          <IconSymbol name="trash" size={20} color="#E57373" />
        </Pressable>
      </View>
    ),
    [cardBg, borderColor, primaryColor, handleEditMember, handleDeleteMember]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
        <IconSymbol name="person.3.fill" size={64} color={primaryColor} />
      </View>
      <ThemedText type="title" style={styles.emptyTitle}>
        {t('family.noMembersYet')}
      </ThemedText>
      <ThemedText style={styles.emptyText}>
        {t('family.noMembersDescription')}
      </ThemedText>
      <Pressable
        style={[styles.emptyButton, { backgroundColor: primaryColor }]}
        onPress={handleAddMember}
      >
        <IconSymbol name="plus" size={20} color="#FFFFFF" />
        <ThemedText style={styles.emptyButtonText}>{t('family.addFirstMember')}</ThemedText>
      </Pressable>
    </View>
  );

  if (isLoading && members.length === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>{t('family.loadingFamily')}</ThemedText>
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={textColor} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          {t('familyManagement.title')}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.subheader}>
        <ThemedText style={styles.familyName}>
          {family?.name ?? t('family.title')}
        </ThemedText>
        <ThemedText style={styles.memberCount}>
          {t('family.member', { count: members.length })}
        </ThemedText>
      </View>

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

      <Pressable
        style={[styles.fab, { backgroundColor: primaryColor }]}
        onPress={handleAddMember}
      >
        <IconSymbol name="plus" size={28} color="#FFFFFF" />
      </Pressable>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
  },
  headerSpacer: {
    width: 40,
  },
  subheader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  familyName: {
    fontSize: 18,
    fontWeight: '600',
  },
  memberCount: {
    opacity: 0.6,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    gap: 12,
  },
  memberName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
  },
  actionButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
