import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import type { BookStatus } from '@/types/models';

interface BookStatusBadgeProps {
  status: BookStatus;
  size?: 'small' | 'medium';
  onPress?: () => void;
}

const STATUS_CONFIG: Record<BookStatus, { labelKey: string; color: string; bgColor: string }> = {
  reading: {
    labelKey: 'bookStatus.reading',
    color: '#FFFFFF',
    bgColor: '#4CAF50',
  },
  'to-read': {
    labelKey: 'bookStatus.toRead',
    color: '#FFFFFF',
    bgColor: '#FF9800',
  },
  read: {
    labelKey: 'bookStatus.read',
    color: '#FFFFFF',
    bgColor: '#2196F3',
  },
};

export function BookStatusBadge({ status, size = 'medium', onPress }: BookStatusBadgeProps) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status];
  const isSmall = size === 'small';

  const content = (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bgColor },
        isSmall && styles.badgeSmall,
      ]}
    >
      <ThemedText
        style={[
          styles.label,
          { color: config.color },
          isSmall && styles.labelSmall,
        ]}
      >
        {t(config.labelKey)}
      </ThemedText>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return content;
}

/**
 * Get the status display configuration with translated label
 */
export function getStatusConfig(status: BookStatus) {
  const config = STATUS_CONFIG[status];
  return {
    ...config,
    label: config.labelKey, // Return the key, consumer should use t() to translate
    bgColor: config.bgColor,
  };
}

/**
 * Get all available statuses
 */
export function getAllStatuses(): BookStatus[] {
  return ['reading', 'to-read', 'read'];
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
  },
});

