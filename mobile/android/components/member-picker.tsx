import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { MemberAvatar } from '@/components/member-avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Member } from '@/types/models';

interface MemberPickerProps {
  /** Compact trigger (avatar + name only) vs full */
  compact?: boolean;
  /** Controlled mode: selected member id (does not update store) */
  value?: string;
  /** Controlled mode: called when user selects a member */
  onChange?: (member: Member) => void;
  /** Custom trigger; receives onPress and selectedMember. When provided, replaces default trigger */
  renderTrigger?: (props: { onPress: () => void; selectedMember: Member | null }) => React.ReactNode;
}

export function MemberPicker({
  compact = false,
  value,
  onChange,
  renderTrigger,
}: MemberPickerProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    family,
    members,
    selectedMember,
    selectedMemberId,
    setSelectedMemberId,
  } = useFamily();
  const [visible, setVisible] = useState(false);

  const isControlled = value !== undefined && onChange !== undefined;
  const effectiveSelectedId = isControlled ? value : selectedMemberId;
  const selectedMemberFromValue = useMemo(
    () => members.find((m) => m.id === effectiveSelectedId) ?? null,
    [members, effectiveSelectedId]
  );
  const displayMember = isControlled ? selectedMemberFromValue : (selectedMember ?? (members.length > 0 ? members[0] : null));

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1A2129' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const overlayBg = 'rgba(0,0,0,0.5)';

  const handleOpen = useCallback(() => {
    setVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  const handleSelectMember = useCallback(
    (member: Member) => {
      if (isControlled) {
        onChange!(member);
      } else {
        setSelectedMemberId(member.id);
      }
      setVisible(false);
    },
    [isControlled, onChange, setSelectedMemberId]
  );

  const handleAddMember = useCallback(() => {
    setVisible(false);
    router.push('/family-management');
  }, [router]);

  const renderMemberItem = useCallback(
    ({ item }: { item: Member }) => {
      const isSelected = item.id === effectiveSelectedId;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.memberRow,
            {
              backgroundColor: cardBg,
              borderColor: isSelected ? primaryColor : borderColor,
              opacity: pressed ? 0.8 : 1,
            },
            isSelected && styles.memberRowSelected,
          ]}
          onPress={() => handleSelectMember(item)}
        >
          <MemberAvatar
            name={item.name}
            color={item.color}
            avatarUrl={item.avatarUrl}
            size="medium"
          />
          <ThemedText style={[styles.memberName, { flex: 1 }]} numberOfLines={1}>
            {item.name}
          </ThemedText>
          {isSelected && (
            <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
          )}
        </Pressable>
      );
    },
    [effectiveSelectedId, primaryColor, cardBg, borderColor, handleSelectMember]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="person.3.fill" size={48} color={primaryColor} />
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {t('memberPicker.noMembersYet')}
      </ThemedText>
      <ThemedText style={styles.emptyText}>
        {t('memberPicker.addInSettings')}
      </ThemedText>
      <Pressable
        style={[styles.addButton, { backgroundColor: primaryColor }]}
        onPress={handleAddMember}
      >
        <IconSymbol name="plus" size={20} color="#FFFFFF" />
        <ThemedText style={styles.addButtonText}>
          {t('family.addFirstMember')}
        </ThemedText>
      </Pressable>
    </View>
  );

  // No family or loading - don't render trigger
  if (!family) {
    return null;
  }

  const hasMembers = members.length > 0;

  const trigger = renderTrigger ? (
    renderTrigger({ onPress: handleOpen, selectedMember: displayMember })
  ) : (
    <Pressable style={styles.trigger} onPress={handleOpen}>
      {displayMember ? (
        <>
          <MemberAvatar
            name={displayMember.name}
            color={displayMember.color}
            avatarUrl={displayMember.avatarUrl}
            size="small"
          />
          {!compact && (
            <ThemedText style={styles.triggerName} numberOfLines={1}>
              {displayMember.name}
            </ThemedText>
          )}
          <IconSymbol
            name="chevron.down"
            size={16}
            color={primaryColor}
            style={styles.chevron}
          />
        </>
      ) : (
        <View style={styles.noMemberTrigger}>
          <IconSymbol name="person.crop.circle.badge.plus" size={28} color={primaryColor} />
          <ThemedText style={[styles.noMemberText, { color: primaryColor }]}>
            {t('memberPicker.addFirstMember')}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );

  return (
    <>
      {trigger}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={[styles.overlay, { backgroundColor: overlayBg }]} onPress={handleClose}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: cardBg, width: Math.min(width - 32, 360) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderColor }]}>
              <ThemedText type="subtitle">{t('memberPicker.selectMember')}</ThemedText>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <IconSymbol name="xmark.circle.fill" size={28} color={primaryColor} />
              </Pressable>
            </View>
            {hasMembers ? (
              <FlatList
                data={members}
                renderItem={renderMemberItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              renderEmptyState()
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triggerName: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 120,
  },
  chevron: {
    marginLeft: 2,
  },
  noMemberTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noMemberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    gap: 12,
  },
  memberRowSelected: {
    borderWidth: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
