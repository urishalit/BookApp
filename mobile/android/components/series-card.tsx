import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { SeriesProgress } from '@/components/series-progress';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { SeriesWithProgress } from '@/hooks/use-series';

interface SeriesCardProps {
  series: SeriesWithProgress;
  onPress?: () => void;
  onLongPress?: () => void;
}

const PLACEHOLDER_COVER = 'https://via.placeholder.com/64x96/E5D4C0/8B5A2B?text=No+Cover';

export function SeriesCard({ series, onPress, onLongPress }: SeriesCardProps) {
  const cardBackground = useThemeColor({}, 'background');
  const borderColor = useThemeColor(
    { light: '#E5D4C0', dark: '#2D3748' },
    'text'
  );
  const subtitleColor = useThemeColor(
    { light: '#666666', dark: '#999999' },
    'text'
  );
  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');

  // Get cover from first book in series, if available
  const firstBook = series.booksInSeries.find((b) => b.seriesOrder === 1) 
    ?? series.booksInSeries[0];
  const coverUrl = firstBook?.thumbnailUrl;

  // Show stacked covers effect for series with multiple books
  const hasMultipleBooks = series.booksOwned > 1;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: cardBackground,
          borderColor: borderColor,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {/* Series Cover Stack */}
      <View style={styles.coverStack}>
        {hasMultipleBooks && (
          <>
            <View style={[styles.stackedCover, styles.stackedCover3, { borderColor }]} />
            <View style={[styles.stackedCover, styles.stackedCover2, { borderColor }]} />
          </>
        )}
        <View style={[styles.coverContainer, { borderColor }]}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.cover}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.placeholderCover, { backgroundColor: borderColor }]}>
              <IconSymbol name="books.vertical.fill" size={28} color={primaryColor} />
            </View>
          )}
        </View>
      </View>

      {/* Series Info */}
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <ThemedText type="subtitle" style={styles.title} numberOfLines={2}>
            {series.name}
          </ThemedText>
          <ThemedText style={[styles.bookCount, { color: subtitleColor }]}>
            {series.totalBooks} {series.totalBooks === 1 ? 'book' : 'books'} in series
          </ThemedText>
        </View>

        {/* Progress */}
        <View style={styles.footer}>
          <SeriesProgress
            booksRead={series.booksRead}
            totalBooks={series.totalBooks}
            booksOwned={series.booksOwned}
            size="small"
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  coverStack: {
    width: 70,
    height: 96,
    position: 'relative',
  },
  stackedCover: {
    position: 'absolute',
    width: 60,
    height: 88,
    backgroundColor: '#E5D4C0',
    borderRadius: 6,
    borderWidth: 1,
  },
  stackedCover2: {
    left: 3,
    top: 2,
    transform: [{ rotate: '2deg' }],
  },
  stackedCover3: {
    left: 6,
    top: 4,
    transform: [{ rotate: '4deg' }],
  },
  coverContainer: {
    width: 64,
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5D4C0',
    borderWidth: 1,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  bookCount: {
    fontSize: 13,
    marginTop: 4,
  },
  footer: {
    marginTop: 8,
  },
});

