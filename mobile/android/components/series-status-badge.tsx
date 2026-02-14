import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { SeriesStatus } from '@/types/models';

interface SeriesStatusBadgeProps {
  status: SeriesStatus;
  size?: 'small' | 'medium';
  onPress?: () => void;
  onStatusChange?: (status: SeriesStatus) => void;
}

const STATUS_CONFIG: Record<SeriesStatus, { labelKey: string; color: string; bgColor: string }> = {
  'to-read': {
    labelKey: 'seriesStatus.toRead',
    color: '#FFFFFF',
    bgColor: '#FF9800',
  },
  reading: {
    labelKey: 'seriesStatus.reading',
    color: '#FFFFFF',
    bgColor: '#4CAF50',
  },
  read: {
    labelKey: 'seriesStatus.read',
    color: '#FFFFFF',
    bgColor: '#2196F3',
  },
  stopped: {
    labelKey: 'seriesStatus.stopped',
    color: '#FFFFFF',
    bgColor: '#9E9E9E',
  },
};

const SERIES_STATUSES: SeriesStatus[] = ['to-read', 'reading', 'read', 'stopped'];

export function SeriesStatusBadge({
  status,
  size = 'medium',
  onPress,
  onStatusChange,
}: SeriesStatusBadgeProps) {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const config = STATUS_CONFIG[status];
  const isSmall = size === 'small';
  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');

  const handlePress = () => {
    if (onStatusChange) {
      setShowPicker(true);
    } else if (onPress) {
      onPress();
    }
  };

  const handleSelect = (newStatus: SeriesStatus) => {
    setShowPicker(false);
    onStatusChange?.(newStatus);
  };

  const content = (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bgColor },
        isSmall && styles.badgeSmall,
        (onPress || onStatusChange) && styles.badgeTappable,
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
      {(onPress || onStatusChange) && (
        <IconSymbol name="chevron.down" size={isSmall ? 10 : 12} color={config.color} />
      )}
    </View>
  );

  if (onPress || onStatusChange) {
    return (
      <>
        <Pressable onPress={handlePress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          {content}
        </Pressable>
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowPicker(false)}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: cardBg, borderColor }]}
              onPress={(e) => e.stopPropagation()}
            >
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {t('seriesStatus.changeStatus')}
              </ThemedText>
              {SERIES_STATUSES.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.option, { backgroundColor: STATUS_CONFIG[s].bgColor }]}
                  onPress={() => handleSelect(s)}
                >
                  <ThemedText style={[styles.optionText, { color: STATUS_CONFIG[s].color }]}>
                    {t(STATUS_CONFIG[s].labelKey)}
                  </ThemedText>
                  {s === status && (
                    <IconSymbol name="checkmark" size={18} color={STATUS_CONFIG[s].color} />
                  )}
                </Pressable>
              ))}
              <Pressable
                style={[styles.cancelButton, { borderColor }]}
                onPress={() => setShowPicker(false)}
              >
                <ThemedText style={[styles.cancelText, { color: primaryColor }]}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeTappable: {
    paddingRight: 8,
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
