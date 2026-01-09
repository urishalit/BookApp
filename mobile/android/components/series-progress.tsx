import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface SeriesProgressProps {
  booksRead: number;
  totalBooks: number;
  booksOwned: number;
  size?: 'small' | 'medium' | 'large';
  showBar?: boolean;
}

/**
 * Visual progress indicator for book series
 * Shows "X of Y read" with optional progress bar
 */
export function SeriesProgress({
  booksRead,
  totalBooks,
  booksOwned,
  size = 'medium',
  showBar = true,
}: SeriesProgressProps) {
  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const progressBg = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'background');
  const subtitleColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');
  
  const progressPercent = totalBooks > 0 ? (booksRead / totalBooks) * 100 : 0;
  const isComplete = booksRead === totalBooks && totalBooks > 0;

  const sizeConfig = {
    small: {
      fontSize: 11,
      barHeight: 4,
      gap: 4,
    },
    medium: {
      fontSize: 13,
      barHeight: 6,
      gap: 6,
    },
    large: {
      fontSize: 15,
      barHeight: 8,
      gap: 8,
    },
  };

  const config = sizeConfig[size];

  return (
    <View style={[styles.container, { gap: config.gap }]}>
      <View style={styles.textRow}>
        <ThemedText
          style={[
            styles.progressText,
            { fontSize: config.fontSize, color: isComplete ? '#4CAF50' : primaryColor },
          ]}
        >
          {booksRead} of {totalBooks} read
        </ThemedText>
        {booksOwned < totalBooks && (
          <ThemedText style={[styles.ownedText, { fontSize: config.fontSize - 2, color: subtitleColor }]}>
            ({booksOwned} owned)
          </ThemedText>
        )}
      </View>
      
      {showBar && (
        <View style={[styles.progressBar, { height: config.barHeight, backgroundColor: progressBg }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progressPercent, 100)}%`,
                backgroundColor: isComplete ? '#4CAF50' : primaryColor,
              },
            ]}
          />
          {/* Show owned books indicator if different from read */}
          {booksOwned > booksRead && (
            <View
              style={[
                styles.ownedIndicator,
                {
                  width: `${Math.min(((booksOwned - booksRead) / totalBooks) * 100, 100 - progressPercent)}%`,
                  left: `${progressPercent}%`,
                  backgroundColor: `${primaryColor}40`,
                },
              ]}
            />
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Compact version showing just the count badge
 */
export function SeriesProgressBadge({
  booksRead,
  totalBooks,
}: Pick<SeriesProgressProps, 'booksRead' | 'totalBooks'>) {
  const isComplete = booksRead === totalBooks && totalBooks > 0;
  const bgColor = isComplete ? '#4CAF50' : '#8B5A2B';

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <ThemedText style={styles.badgeText}>
        {booksRead}/{totalBooks}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontWeight: '600',
  },
  ownedText: {
    fontWeight: '400',
  },
  progressBar: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  ownedIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

