import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SeriesPicker } from '@/components/series-picker';
import { GenrePicker } from '@/components/genre-picker';
import { GenreBadgeList } from '@/components/genre-badge';
import { getAllStatuses, getStatusConfig } from '@/components/book-status-badge';
import { useBookOperations } from '@/hooks/use-books';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import { normalizeApiCategories } from '@/constants/genres';
import type { BookStatus } from '@/types/models';

const PLACEHOLDER_COVER = 'https://via.placeholder.com/128x192/E5D4C0/8B5A2B?text=No+Cover';

export default function AddFromSearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    googleBooksId: string;
    title: string;
    author: string;
    thumbnailUrl?: string;
    description?: string;
    pageCount?: string;
    publishedDate?: string;
    categories?: string;
  }>();

  const { selectedMember } = useFamily();
  const { addBook } = useBookOperations();

  // Parse and normalize categories from Google Books API
  const initialGenres = useMemo(() => {
    if (!params.categories) return [];
    const categories = params.categories.split('|||').filter(Boolean);
    return normalizeApiCategories(categories);
  }, [params.categories]);

  const [status, setStatus] = useState<BookStatus>('to-read');
  const [genres, setGenres] = useState<string[]>(initialGenres);
  const [seriesId, setSeriesId] = useState<string | undefined>();
  const [seriesOrder, setSeriesOrder] = useState<number | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showGenreEditor, setShowGenreEditor] = useState(false);

  // Update genres when initialGenres changes (on first load)
  useEffect(() => {
    if (initialGenres.length > 0 && genres.length === 0) {
      setGenres(initialGenres);
    }
  }, [initialGenres]);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const inputBg = useThemeColor({ light: '#F5F0EA', dark: '#1A2129' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const subtitleColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const handleSubmit = useCallback(async () => {
    if (!params.title || !params.author) {
      Alert.alert(t('common.error'), 'Book data is missing.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addBook({
        title: params.title,
        author: params.author,
        status,
        googleBooksId: params.googleBooksId,
        thumbnailUrl: params.thumbnailUrl || undefined,
        genres: genres.length > 0 ? genres : undefined,
        seriesId,
        seriesOrder,
      });

      // Go back to search screen and then to books
      router.dismiss();
    } catch (error) {
      console.error('Add book error:', error);
      const message = error instanceof Error ? error.message : 'Failed to add book';
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSubmitting(false);
    }
  }, [params, status, genres, seriesId, seriesOrder, addBook, router, t]);

  if (!selectedMember) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            Please select a family member first.
          </ThemedText>
          <Pressable
            style={[styles.button, { backgroundColor: primaryColor }]}
            onPress={() => router.push('/(tabs)/family')}
          >
            <ThemedText style={styles.buttonText}>Go to Family</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const description = params.description || '';
  const shouldTruncate = description.length > 200 && !showFullDescription;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Book Preview Card */}
          <View style={[styles.previewCard, { backgroundColor: cardBg, borderColor }]}>
            {/* Cover */}
            <View style={styles.coverSection}>
              <View style={styles.coverContainer}>
                <Image
                  source={{ uri: params.thumbnailUrl || PLACEHOLDER_COVER }}
                  style={styles.cover}
                  contentFit="cover"
                  transition={200}
                />
              </View>
              <View style={styles.googleBadge}>
                <IconSymbol name="checkmark.seal.fill" size={14} color="#4285F4" />
                <ThemedText style={styles.googleBadgeText}>Google Books</ThemedText>
              </View>
            </View>

            {/* Book Info */}
            <View style={styles.bookInfo}>
              <ThemedText type="subtitle" style={styles.bookTitle}>
                {params.title}
              </ThemedText>
              <ThemedText style={[styles.bookAuthor, { color: subtitleColor }]}>
                by {params.author}
              </ThemedText>

              {/* Metadata row */}
              <View style={styles.metaRow}>
                {params.publishedDate && (
                  <View style={styles.metaItem}>
                    <IconSymbol name="calendar" size={14} color={subtitleColor} />
                    <ThemedText style={[styles.metaText, { color: subtitleColor }]}>
                      {params.publishedDate.substring(0, 4)}
                    </ThemedText>
                  </View>
                )}
                {params.pageCount && (
                  <View style={styles.metaItem}>
                    <IconSymbol name="book.pages" size={14} color={subtitleColor} />
                    <ThemedText style={[styles.metaText, { color: subtitleColor }]}>
                      {params.pageCount} {t('common.pages', 'pages')}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Genres from API */}
              {genres.length > 0 && (
                <Pressable 
                  style={styles.genresContainer}
                  onPress={() => setShowGenreEditor(!showGenreEditor)}
                >
                  <GenreBadgeList genres={genres} size="small" maxDisplay={3} />
                  <IconSymbol name="pencil" size={14} color={subtitleColor} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Description */}
          {description && (
            <View style={[styles.descriptionCard, { backgroundColor: cardBg, borderColor }]}>
              <ThemedText style={styles.sectionLabel}>{t('common.description', 'Description')}</ThemedText>
              <ThemedText style={[styles.description, { color: subtitleColor }]}>
                {shouldTruncate ? `${description.substring(0, 200)}...` : description}
              </ThemedText>
              {description.length > 200 && (
                <Pressable onPress={() => setShowFullDescription(!showFullDescription)}>
                  <ThemedText style={[styles.showMore, { color: primaryColor }]}>
                    {showFullDescription ? t('common.showLess', 'Show less') : t('common.showMore', 'Show more')}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}

          {/* Genre Editor (collapsible) */}
          {showGenreEditor && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.sectionLabel}>{t('genrePicker.title')}</ThemedText>
              <GenrePicker
                selectedGenres={genres}
                onGenresChange={setGenres}
              />
            </View>
          )}

          {/* Add genres button if none exist */}
          {genres.length === 0 && !showGenreEditor && (
            <Pressable 
              style={[styles.addGenresButton, { borderColor }]}
              onPress={() => setShowGenreEditor(true)}
            >
              <IconSymbol name="plus" size={16} color={primaryColor} />
              <ThemedText style={[styles.addGenresText, { color: primaryColor }]}>
                {t('genrePicker.addGenre', 'Add genres')}
              </ThemedText>
            </Pressable>
          )}

          {/* Status Selector */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.sectionLabel}>Reading Status</ThemedText>
            <View style={[styles.statusContainer, { backgroundColor: cardBg }]}>
              {getAllStatuses().map((s) => {
                const config = getStatusConfig(s);
                const isActive = status === s;
                return (
                  <Pressable
                    key={s}
                    style={[
                      styles.statusOption,
                      isActive && { backgroundColor: config.bgColor },
                    ]}
                    onPress={() => setStatus(s)}
                  >
                    <ThemedText
                      style={[
                        styles.statusLabel,
                        { color: isActive ? '#FFFFFF' : textColor },
                      ]}
                    >
                      {config.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Series Picker */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.sectionLabel}>Series (Optional)</ThemedText>
            <SeriesPicker
              selectedSeriesId={seriesId}
              onSeriesSelect={(id, order) => {
                setSeriesId(id);
                if (order !== undefined) setSeriesOrder(order);
              }}
              seriesOrder={seriesOrder}
              onSeriesOrderChange={setSeriesOrder}
            />
          </View>

          {/* Adding for member info */}
          <View style={[styles.memberNote, { backgroundColor: inputBg }]}>
            <ThemedText style={styles.memberNoteText}>
              Adding book for: <ThemedText style={{ fontWeight: '600' }}>{selectedMember.name}</ThemedText>
            </ThemedText>
          </View>

          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: primaryColor },
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <IconSymbol name="plus.circle.fill" size={20} color="#FFFFFF" />
            <ThemedText style={styles.submitButtonText}>
              {isSubmitting ? 'Adding...' : 'Add to Library'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    gap: 16,
  },
  coverSection: {
    alignItems: 'center',
    gap: 8,
  },
  coverContainer: {
    width: 100,
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E5D4C0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
  },
  googleBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4285F4',
  },
  bookInfo: {
    flex: 1,
    gap: 8,
  },
  bookTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  bookAuthor: {
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  genresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addGenresButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addGenresText: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  showMore: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  inputGroup: {
    gap: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberNote: {
    padding: 16,
    borderRadius: 12,
  },
  memberNoteText: {
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
