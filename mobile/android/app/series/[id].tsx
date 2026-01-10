import React, { useCallback, useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookCard } from '@/components/book-card';
import { SeriesProgress } from '@/components/series-progress';
import { GenreBadge } from '@/components/genre-badge';
import { GenrePicker } from '@/components/genre-picker';
import { useSeriesDetail, useSeriesOperations } from '@/hooks/use-series';
import { useBookOperations, getNextStatus } from '@/hooks/use-books';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getGenresByFrequency } from '@/constants/genres';
import type { SeriesBookDisplay } from '@/types/models';

export default function SeriesDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { series, books, isLoading } = useSeriesDetail(id);
  const { editSeries, removeSeries } = useSeriesOperations();
  const { addOrUpdateBookStatus, updateSeriesBooksGenres } = useBookOperations();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTotalBooks, setEditTotalBooks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingGenres, setIsEditingGenres] = useState(false);
  const [localGenres, setLocalGenres] = useState<string[]>([]);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const subtitleColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');
  const inputBg = useThemeColor({ light: '#F5F5F5', dark: '#1A2129' }, 'background');
  const textColor = useThemeColor({}, 'text');

  // Compute genres from all books in series, sorted by frequency
  const seriesGenres = useMemo(() => {
    const bookGenres = books.map(b => b.genres);
    return getGenresByFrequency(bookGenres);
  }, [books]);

  // Sync local genres with computed genres from books
  useEffect(() => {
    setLocalGenres(seriesGenres);
  }, [seriesGenres]);

  const handleBookPress = useCallback(
    (book: SeriesBookDisplay) => {
      // Only navigate to book detail if the book is in the member's library
      if (book.isInLibrary && book.libraryEntryId) {
        router.push({
          pathname: '/book/[id]',
          params: { id: book.id },
        });
      } else {
        // Book not in library - prompt to add it
        Alert.alert(
          t('seriesDetail.addToLibraryTitle'),
          t('seriesDetail.addToLibraryMessage', { title: book.title }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('seriesDetail.addToLibraryButton'),
              onPress: async () => {
                try {
                  await addOrUpdateBookStatus(book.id, 'to-read', undefined);
                  // After adding, navigate to the book detail
                  router.push({
                    pathname: '/book/[id]',
                    params: { id: book.id },
                  });
                } catch (err) {
                  Alert.alert(t('common.error'), t('seriesDetail.failedToAddBook'));
                }
              },
            },
          ]
        );
      }
    },
    [router, addOrUpdateBookStatus]
  );

  const handleStatusChange = useCallback(
    async (book: SeriesBookDisplay) => {
      const nextStatus = getNextStatus(book.status);
      try {
        // addOrUpdateBookStatus handles both cases:
        // - If libraryEntryId exists, updates the status
        // - If not, adds the book to library with the new status
        await addOrUpdateBookStatus(book.id, nextStatus, book.libraryEntryId);
      } catch (err) {
        Alert.alert(t('common.error'), t('books.failedToUpdateStatus'));
      }
    },
    [addOrUpdateBookStatus]
  );

  const handleStartEdit = useCallback(() => {
    if (!series) return;
    setEditName(series.name);
    setEditTotalBooks(series.totalBooks.toString());
    setIsEditing(true);
  }, [series]);

  const handleSaveEdit = useCallback(async () => {
    if (!series || !id) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert(t('seriesDetail.nameRequired'), t('seriesDetail.nameRequiredMessage'));
      return;
    }

    const bookCount = parseInt(editTotalBooks, 10);
    if (isNaN(bookCount) || bookCount < 1) {
      Alert.alert(t('seriesDetail.invalidCount'), t('seriesDetail.invalidCountMessage'));
      return;
    }

    setIsSaving(true);
    try {
      await editSeries(id, {
        name: trimmedName,
        totalBooks: bookCount,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update series:', error);
      Alert.alert(t('common.error'), t('seriesDetail.failedToUpdate'));
    } finally {
      setIsSaving(false);
    }
  }, [series, id, editName, editTotalBooks, editSeries]);

  const handleDelete = useCallback(() => {
    if (!series || !id) return;

    Alert.alert(
      t('series.deleteSeries'),
      t('seriesDetail.deleteConfirm', { name: series.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSeries(id);
              router.back();
            } catch (error) {
              console.error('Failed to delete series:', error);
              Alert.alert(t('common.error'), t('series.failedToDelete'));
            }
          },
        },
      ]
    );
  }, [series, id, removeSeries, router, t]);

  const handleGenresChange = useCallback(
    async (newGenres: string[]) => {
      if (!id) return;

      // Update local state immediately for responsive UI
      setLocalGenres(newGenres);

      // Autosave to all books in series
      try {
        await updateSeriesBooksGenres(id, newGenres);
      } catch (error) {
        console.error('Failed to update series genres:', error);
        Alert.alert(t('common.error'), t('seriesDetail.failedToUpdateGenres'));
      }
    },
    [id, updateSeriesBooksGenres, t]
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>{t('seriesDetail.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (!series) {
    return (
      <ThemedView style={styles.errorContainer}>
        <IconSymbol name="books.vertical.fill" size={64} color={subtitleColor} />
        <ThemedText style={styles.errorText}>{t('seriesDetail.notFound')}</ThemedText>
        <Pressable
          style={[styles.button, { backgroundColor: primaryColor }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.buttonText}>{t('common.goBack')}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const renderBook = ({ item }: { item: SeriesBookDisplay }) => (
    <BookCard
      book={item}
      onPress={() => handleBookPress(item)}
      onStatusPress={() => handleStatusChange(item)}
    />
  );

  const renderHeader = () => (
    <>
      {/* Series Info Card */}
      <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
        {/* Series Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}20` }]}>
          <IconSymbol name="books.vertical.fill" size={48} color={primaryColor} />
        </View>

        {/* Series Name */}
        {isEditing ? (
          <TextInput
            style={[styles.nameInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
            value={editName}
            onChangeText={setEditName}
            placeholder={t('seriesDetail.namePlaceholder')}
            autoFocus
          />
        ) : (
          <ThemedText type="title" style={styles.seriesName}>
            {series.name}
          </ThemedText>
        )}

        {/* Total Books */}
        {isEditing ? (
          <View style={styles.editRow}>
            <ThemedText style={styles.editLabel}>{t('seriesDetail.totalBooks')}</ThemedText>
            <TextInput
              style={[styles.numberInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
              value={editTotalBooks}
              onChangeText={setEditTotalBooks}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        ) : (
          <ThemedText style={[styles.bookCount, { color: subtitleColor }]}>
            {t('seriesDetail.booksInSeries', { count: series.totalBooks })}
          </ThemedText>
        )}

        {/* Progress */}
        {!isEditing && (
          <View style={styles.progressContainer}>
            <SeriesProgress
              booksRead={series.booksRead}
              totalBooks={series.totalBooks}
              booksOwned={series.booksOwned}
              size="large"
            />
          </View>
        )}

        {/* Genres Section */}
        {!isEditing && (
          <View style={styles.genresSection}>
            <View style={styles.genresHeader}>
              <ThemedText style={[styles.genresLabel, { color: subtitleColor }]}>
                {t('genrePicker.title')}
              </ThemedText>
              <Pressable onPress={() => setIsEditingGenres(!isEditingGenres)}>
                <ThemedText style={[styles.genresEditLink, { color: primaryColor }]}>
                  {isEditingGenres ? t('common.done') : t('common.edit')}
                </ThemedText>
              </Pressable>
            </View>
            
            {isEditingGenres ? (
              <GenrePicker
                selectedGenres={localGenres}
                onGenresChange={handleGenresChange}
              />
            ) : (
              <View style={styles.genresList}>
                {localGenres.length > 0 ? (
                  localGenres.map((genre) => (
                    <GenreBadge key={genre} genre={genre} size="medium" />
                  ))
                ) : (
                  <ThemedText style={[styles.noGenres, { color: subtitleColor }]}>
                    {t('genrePicker.noGenres')}
                  </ThemedText>
                )}
              </View>
            )}
          </View>
        )}

        {/* Edit/Save Buttons */}
        {isEditing ? (
          <View style={styles.editButtons}>
            <Pressable
              style={[styles.editButton, { borderColor: subtitleColor }]}
              onPress={() => setIsEditing(false)}
            >
              <ThemedText style={[styles.editButtonText, { color: subtitleColor }]}>
                {t('common.cancel')}
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.editButton, styles.saveButton, { backgroundColor: primaryColor }]}
              onPress={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText style={[styles.editButtonText, { color: '#FFFFFF' }]}>
                  {t('common.save')}
                </ThemedText>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.editLink} onPress={handleStartEdit}>
            <IconSymbol name="pencil" size={16} color={primaryColor} />
            <ThemedText style={[styles.editLinkText, { color: primaryColor }]}>
              {t('seriesDetail.editSeries')}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Books Section Header */}
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t('seriesDetail.booksSection', { count: books.length })}
        </ThemedText>
      </View>

      {/* Empty State for Books */}
      {books.length === 0 && (
        <View style={[styles.emptyBooks, { backgroundColor: cardBg, borderColor }]}>
          <IconSymbol name="book.fill" size={40} color={subtitleColor} />
          <ThemedText style={[styles.emptyBooksText, { color: subtitleColor }]}>
            {t('seriesDetail.noBooksYet')}
          </ThemedText>
          <ThemedText style={[styles.emptyBooksHint, { color: subtitleColor }]}>
            {t('seriesDetail.addBooksHint')}
          </ThemedText>
        </View>
      )}
    </>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {/* Delete Button */}
      <Pressable
        style={[styles.deleteButton, { borderColor: '#E57373' }]}
        onPress={handleDelete}
      >
        <IconSymbol name="trash" size={20} color="#E57373" />
        <ThemedText style={styles.deleteButtonText}>{t('series.deleteSeries')}</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={books}
        renderItem={renderBook}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    opacity: 0.7,
    textAlign: 'center',
  },
  infoCard: {
    margin: 16,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  seriesName: {
    fontSize: 24,
    textAlign: 'center',
  },
  nameInput: {
    width: '100%',
    height: 48,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
  },
  bookCount: {
    fontSize: 15,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editLabel: {
    fontSize: 15,
  },
  numberInput: {
    width: 60,
    height: 40,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
  },
  genresSection: {
    width: '100%',
    marginTop: 12,
    gap: 12,
  },
  genresHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genresLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  genresEditLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  noGenres: {
    fontSize: 14,
    textAlign: 'center',
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
  },
  editLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButton: {
    borderWidth: 0,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
  },
  emptyBooks: {
    margin: 16,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyBooksText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyBooksHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  footerContainer: {
    padding: 20,
    marginTop: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  deleteButtonText: {
    color: '#E57373',
    fontSize: 16,
    fontWeight: '600',
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

