import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { MemberAvatar } from '@/components/member-avatar';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Member } from '@/types/models';

interface MemberCardProps {
  member: Member;
  isSelected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function MemberCard({
  member,
  isSelected,
  onPress,
  onLongPress,
}: MemberCardProps) {
  const cardBackground = useThemeColor({}, 'background');
  const borderColor = useThemeColor(
    { light: '#E5D4C0', dark: '#2D3748' },
    'border'
  );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: cardBackground,
          borderColor: isSelected ? member.color : borderColor,
          opacity: pressed ? 0.8 : 1,
        },
        isSelected && styles.selected,
      ]}
    >
      <MemberAvatar
        name={member.name}
        color={member.color}
        avatarUrl={member.avatarUrl}
        size="medium"
      />
      <View style={styles.content}>
        <ThemedText type="subtitle" style={styles.name} numberOfLines={1}>
          {member.name}
        </ThemedText>
      </View>
      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: member.color }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  selected: {
    borderWidth: 2,
    shadowOpacity: 0.15,
    elevation: 5,
  },
  content: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 18,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});

