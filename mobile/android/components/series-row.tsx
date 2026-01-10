import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { GenreBadgeList } from '@/components/genre-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getGenresByFrequency } from '@/constants/genres';
import type { MemberBook, Series } from '@/types/models';

interface SeriesRowProps {
  series: Series;
  booksInSeries: MemberBook[];
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * Compact inline series row for the Books tab.
 * Shows series name, stacked covers preview, and progress badge.
 * Used to collapse multiple books into a single row.
 */
export function SeriesRow({ series, booksInSeries, onPress, onLongPress }: SeriesRowProps) {
  const { t } = useTranslation();
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

  // Get cover from first book in series by order
  const sortedBooks = [...booksInSeries].sort((a, b) => {
    const orderA = a.seriesOrder ?? Infinity;
    const orderB = b.seriesOrder ?? Infinity;
    return orderA - orderB;
  });
  const firstBook = sortedBooks[0];
  const coverUrl = firstBook?.thumbnailUrl;

  const booksRead = booksInSeries.filter((b) => b.status === 'read').length;
  const booksOwned = booksInSeries.length;
  const hasMultipleBooks = booksOwned > 1;

  // Find currently reading book
  const currentlyReading = booksInSeries.find((b) => b.status === 'reading');

  // Compute genres from all books in series, sorted by frequency
  const seriesGenres = useMemo(() => {
    const bookGenres = booksInSeries.map(b => b.genres);
    return getGenresByFrequency(bookGenres);
  }, [booksInSeries]);

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
              <IconSymbol name="books.vertical.fill" size={24} color={primaryColor} />
            </View>
          )}
        </View>
      </View>

      {/* Series Info */}
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <ThemedText type="subtitle" style={styles.title} numberOfLines={1}>
            {series.name}
          </ThemedText>

          {/* Row 1: Read count */}
          <View style={styles.statusRow}>
            <IconSymbol name="checkmark.circle.fill" size={14} color={primaryColor} />
            <ThemedText style={[styles.statusText, { color: subtitleColor }]}>
              {t('series.booksRead', { read: booksRead, total: series.totalBooks })}
            </ThemedText>
          </View>

          {/* Row 2: Genres (if any) */}
          {seriesGenres.length > 0 && (
            <View style={styles.genresRow}>
              <GenreBadgeList genres={seriesGenres} size="small" maxDisplay={2} />
            </View>
          )}

          {/* Row 3: Currently reading (if any) */}
          {currentlyReading && (
            <View style={styles.statusRow}>
              <IconSymbol name="book.fill" size={14} color={primaryColor} />
              <ThemedText style={[styles.readingText, { color: primaryColor }]} numberOfLines={1}>
                {currentlyReading.seriesOrder ? `#${currentlyReading.seriesOrder} - ` : ''}
                {currentlyReading.title}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.chevron}>
          <IconSymbol name="chevron.right" size={16} color={subtitleColor} />
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
    width: 62,
    height: 96,
    position: 'relative',
  },
  stackedCover: {
    position: 'absolute',
    width: 52,
    height: 80,
    backgroundColor: '#E5D4C0',
    borderRadius: 5,
    borderWidth: 1,
  },
  stackedCover2: {
    left: 3,
    top: 5,
    transform: [{ rotate: '2deg' }],
  },
  stackedCover3: {
    left: 6,
    top: 10,
    transform: [{ rotate: '4deg' }],
  },
  coverContainer: {
    width: 56,
    height: 84,
    borderRadius: 6,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genresRow: {
    marginTop: 2,
  },
  statusText: {
    fontSize: 13,
  },
  readingText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  chevron: {
    opacity: 0.5,
    marginLeft: 8,
  },
});

