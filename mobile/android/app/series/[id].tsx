import React, { useCallback, useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookCard } from '@/components/book-card';
import { SeriesProgress } from '@/components/series-progress';
import { GenreBadge } from '@/components/genre-badge';
import { GenrePicker } from '@/components/genre-picker';
import { SeriesBookSearchModal } from '@/components/series-book-search-modal';
import { useSeriesDetail, useSeriesOperations } from '@/hooks/use-series';
import { useBookOperations, getNextStatus } from '@/hooks/use-books';
import { useFamilyStore } from '@/stores/family-store';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getGenresByFrequency } from '@/constants/genres';
import { getSeriesCoverFromBooks } from '@/lib/series-cover-utils';
import { uploadSeriesCover } from '@/lib/storage';
import type { SeriesBookDisplay } from '@/types/models';

const PLACEHOLDER_COVER = 'https://via.placeholder.com/128x192/E5D4C0/8B5A2B?text=No+Cover';

export default function SeriesDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const family = useFamilyStore((s) => s.family);
  const { series, books, isLoading } = useSeriesDetail(id);
  const { editSeries, removeSeries } = useSeriesOperations();
  const { addOrUpdateBookStatus, updateSeriesBooksGenres, addBooksToSeries } = useBookOperations();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingGenres, setIsEditingGenres] = useState(false);
  const [localGenres, setLocalGenres] = useState<string[]>([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isCoverPickerModalOpen, setIsCoverPickerModalOpen] = useState(false);

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
    setIsEditing(true);
  }, [series]);

  const handleSaveEdit = useCallback(async () => {
    if (!series || !id) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert(t('seriesDetail.nameRequired'), t('seriesDetail.nameRequiredMessage'));
      return;
    }

    setIsSaving(true);
    try {
      await editSeries(id, { name: trimmedName });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update series:', error);
      Alert.alert(t('common.error'), t('seriesDetail.failedToUpdate'));
    } finally {
      setIsSaving(false);
    }
  }, [series, id, editName, editSeries]);

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

  const handleBooksAdded = useCallback(
    async (selectedBooks: any[]) => {
      if (!id) return;

      try {
        await addBooksToSeries(id, selectedBooks);
        // Books will be automatically updated via the real-time listener
      } catch (error) {
        console.error('Failed to add books to series:', error);
        Alert.alert(t('common.error'), t('seriesBookSearch.failedToAdd'));
        throw error; // Re-throw so modal can handle it
      }
    },
    [id, addBooksToSeries, t]
  );

  // Cover: series.thumbnailUrl > first book with cover
  const coverUrl =
    series?.thumbnailUrl ?? getSeriesCoverFromBooks(books) ?? PLACEHOLDER_COVER;

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (
      !result.canceled &&
      result.assets[0] &&
      id &&
      family
    ) {
      setIsUploadingCover(true);
      try {
        const downloadUrl = await uploadSeriesCover(
          result.assets[0].uri,
          family.id,
          id
        );
        await editSeries(id, { thumbnailUrl: downloadUrl });
      } catch (error) {
        console.error('Failed to upload cover:', error);
        Alert.alert(t('common.error'), t('seriesDetail.failedToUpdateCover'));
      } finally {
        setIsUploadingCover(false);
      }
    }
  }, [id, family, editSeries, t]);

  const handleTakePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('addBook.permissionRequired'), t('addBook.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (
      !result.canceled &&
      result.assets[0] &&
      id &&
      family
    ) {
      setIsUploadingCover(true);
      try {
        const downloadUrl = await uploadSeriesCover(
          result.assets[0].uri,
          family.id,
          id
        );
        await editSeries(id, { thumbnailUrl: downloadUrl });
      } catch (error) {
        console.error('Failed to upload cover:', error);
        Alert.alert(t('common.error'), t('seriesDetail.failedToUpdateCover'));
      } finally {
        setIsUploadingCover(false);
      }
    }
  }, [id, family, editSeries, t]);

  const handleEditCover = useCallback(() => {
    Alert.alert(
      t('seriesDetail.editCover'),
      t('seriesDetail.chooseCoverMethod'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('seriesDetail.pickFromBooks'),
          onPress: () => setIsCoverPickerModalOpen(true),
        },
        {
          text: t('seriesDetail.galleryOrCamera'),
          onPress: () => {
            Alert.alert(
              t('seriesDetail.chooseSource'),
              undefined,
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('member.chooseFromLibrary'), onPress: handlePickImage },
                { text: t('member.takePhoto'), onPress: handleTakePhoto },
              ]
            );
          },
        },
      ]
    );
  }, [t, handlePickImage, handleTakePhoto]);

  const handlePickBookCover = useCallback(
    async (book: SeriesBookDisplay) => {
      if (!id || !book.thumbnailUrl) return;
      setIsCoverPickerModalOpen(false);
      try {
        await editSeries(id, { thumbnailUrl: book.thumbnailUrl });
      } catch (error) {
        console.error('Failed to set series cover:', error);
        Alert.alert(t('common.error'), t('seriesDetail.failedToUpdateCover'));
      }
    },
    [id, editSeries, t]
  );

  // Get existing Google Books IDs to prevent duplicates
  const existingBookIds = useMemo(() => {
    return books
      .map((book) => book.googleBooksId)
      .filter((id): id is string => !!id);
  }, [books]);

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
        {/* Series Cover */}
        {isEditing ? (
          <Pressable
            style={[styles.coverContainer, { borderColor }]}
            onPress={handleEditCover}
            disabled={isUploadingCover}
          >
            <Image
              source={{ uri: coverUrl }}
              style={styles.coverImage}
              contentFit="cover"
              transition={300}
            />
            {isUploadingCover ? (
              <View style={styles.coverOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            ) : (
              <View style={styles.editCoverButton}>
                <IconSymbol name="pencil" size={16} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        ) : (
          <View style={[styles.coverContainer, { borderColor }]}>
            <Image
              source={{ uri: coverUrl }}
              style={styles.coverImage}
              contentFit="cover"
              transition={300}
            />
          </View>
        )}

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

        {/* Total Books (read-only, auto-derived from max seriesOrder) */}
        {!isEditing && (
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
        <Pressable
          style={[styles.searchBooksButton, { borderColor: primaryColor }]}
          onPress={() => setIsSearchModalOpen(true)}
        >
          <IconSymbol name="magnifyingglass" size={16} color={primaryColor} />
          <ThemedText style={[styles.searchBooksText, { color: primaryColor }]}>
            {t('seriesBookSearch.searchBooks')}
          </ThemedText>
        </Pressable>
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
      <SeriesBookSearchModal
        visible={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onBooksSelected={handleBooksAdded}
        existingBookIds={existingBookIds}
      />
      {/* Cover Picker Modal: pick from books in series */}
      <Modal
        visible={isCoverPickerModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsCoverPickerModalOpen(false)}
      >
        <View style={[styles.coverPickerModal, { backgroundColor: cardBg }]}>
          <View style={[styles.coverPickerHeader, { borderColor }]}>
            <ThemedText type="subtitle" style={styles.coverPickerTitle}>
              {t('seriesDetail.pickFromBooks')}
            </ThemedText>
            <Pressable onPress={() => setIsCoverPickerModalOpen(false)}>
              <IconSymbol name="xmark" size={24} color={primaryColor} />
            </Pressable>
          </View>
          <FlatList
            data={books.filter((b) => b.thumbnailUrl)}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.coverPickerList}
            columnWrapperStyle={styles.coverPickerRow}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.coverPickerItem, { borderColor }]}
                onPress={() => handlePickBookCover(item)}
              >
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={styles.coverPickerThumb}
                  contentFit="cover"
                />
                <ThemedText
                  style={[styles.coverPickerItemTitle, { color: textColor }]}
                  numberOfLines={2}
                >
                  {item.title}
                </ThemedText>
              </Pressable>
            )}
          />
          {books.filter((b) => b.thumbnailUrl).length === 0 && (
            <View style={styles.coverPickerEmpty}>
              <IconSymbol name="book.fill" size={48} color={subtitleColor} />
              <ThemedText style={[styles.coverPickerEmptyText, { color: subtitleColor }]}>
                {t('seriesDetail.noBookCovers')}
              </ThemedText>
            </View>
          )}
        </View>
      </Modal>
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
  coverContainer: {
    width: 128,
    height: 192,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 8,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editCoverButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    flex: 1,
  },
  searchBooksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  searchBooksText: {
    fontSize: 14,
    fontWeight: '500',
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
  coverPickerModal: {
    flex: 1,
    paddingTop: 60,
  },
  coverPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  coverPickerTitle: {
    flex: 1,
  },
  coverPickerList: {
    padding: 16,
  },
  coverPickerRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  coverPickerItem: {
    flex: 1,
    marginHorizontal: 6,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverPickerThumb: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  coverPickerItemTitle: {
    padding: 8,
    fontSize: 14,
  },
  coverPickerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  coverPickerEmptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

