import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { BookStatusBadge } from '@/components/book-status-badge';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Book } from '@/types/models';

interface BookCardProps {
  book: Book;
  onPress?: () => void;
  onLongPress?: () => void;
  onStatusPress?: () => void;
}

const PLACEHOLDER_COVER = 'https://via.placeholder.com/128x192/E5D4C0/8B5A2B?text=No+Cover';

export function BookCard({ book, onPress, onLongPress, onStatusPress }: BookCardProps) {
  const cardBackground = useThemeColor({}, 'background');
  const borderColor = useThemeColor(
    { light: '#E5D4C0', dark: '#2D3748' },
    'text'
  );
  const subtitleColor = useThemeColor(
    { light: '#666666', dark: '#999999' },
    'text'
  );

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
      {/* Book Cover */}
      <View style={styles.coverContainer}>
        <Image
          source={{ uri: book.thumbnailUrl || PLACEHOLDER_COVER }}
          style={styles.cover}
          contentFit="cover"
          transition={200}
        />
      </View>

      {/* Book Info */}
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <ThemedText type="subtitle" style={styles.title} numberOfLines={2}>
            {book.title}
          </ThemedText>
          <ThemedText style={[styles.author, { color: subtitleColor }]} numberOfLines={1}>
            {book.author}
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <BookStatusBadge
            status={book.status}
            size="small"
            onPress={onStatusPress}
          />
          {book.seriesOrder && (
            <ThemedText style={[styles.seriesOrder, { color: subtitleColor }]}>
              #{book.seriesOrder}
            </ThemedText>
          )}
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
  coverContainer: {
    width: 64,
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5D4C0',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  author: {
    fontSize: 14,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  seriesOrder: {
    fontSize: 13,
    fontWeight: '500',
  },
});

