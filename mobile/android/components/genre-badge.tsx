import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { getGenreDisplay } from '@/constants/genres';

interface GenreBadgeProps {
  genre: string;
  size?: 'small' | 'medium';
  onPress?: () => void;
  onRemove?: () => void;
}

export function GenreBadge({ genre, size = 'medium', onPress, onRemove }: GenreBadgeProps) {
  const { t } = useTranslation();
  const { name, color } = getGenreDisplay(genre, t);
  
  const isSmall = size === 'small';
  
  const content = (
    <View
      style={[
        styles.badge,
        { backgroundColor: color },
        isSmall && styles.badgeSmall,
      ]}
    >
      <ThemedText
        style={[
          styles.text,
          isSmall && styles.textSmall,
        ]}
        numberOfLines={1}
      >
        {name}
      </ThemedText>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          style={styles.removeButton}
          hitSlop={8}
        >
          <ThemedText style={styles.removeText}>×</ThemedText>
        </Pressable>
      )}
    </View>
  );
  
  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  
  return content;
}

interface GenreBadgeListProps {
  genres: string[];
  size?: 'small' | 'medium';
  maxDisplay?: number;
  onGenrePress?: (genre: string) => void;
}

export function GenreBadgeList({ 
  genres, 
  size = 'small', 
  maxDisplay = 3,
  onGenrePress,
}: GenreBadgeListProps) {
  const displayGenres = genres.slice(0, maxDisplay);
  const remaining = genres.length - maxDisplay;
  
  if (genres.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.list}>
      {displayGenres.map((genre) => (
        <GenreBadge
          key={genre}
          genre={genre}
          size={size}
          onPress={onGenrePress ? () => onGenrePress(genre) : undefined}
        />
      ))}
      {remaining > 0 && (
        <View style={[styles.badge, styles.moreBadge, size === 'small' && styles.badgeSmall]}>
          <ThemedText style={[styles.text, styles.moreText, size === 'small' && styles.textSmall]}>
            +{remaining}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 11,
  },
  removeButton: {
    marginLeft: 2,
  },
  removeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 16,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  moreBadge: {
    backgroundColor: '#9E9E9E',
  },
  moreText: {
    opacity: 0.9,
  },
});

