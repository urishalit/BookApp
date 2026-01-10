import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SeriesPicker } from '@/components/series-picker';
import { GenrePicker } from '@/components/genre-picker';
import { GenreBadge } from '@/components/genre-badge';
import { getAllStatuses, getStatusConfig } from '@/components/book-status-badge';
import { useBooks, useBookOperations } from '@/hooks/use-books';
import { useSeries } from '@/hooks/use-series';
import { useFamilyStore } from '@/stores/family-store';
import { useThemeColor } from '@/hooks/use-theme-color';
import { uploadBookCover } from '@/lib/storage';
import type { MemberBook, BookStatus } from '@/types/models';

const PLACEHOLDER_COVER = 'https://via.placeholder.com/256x384/E5D4C0/8B5A2B?text=No+Cover';

export default function BookDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { allBooks, isLoading } = useBooks();
  const { updateBookStatus, updateBookMetadata, removeBook } = useBookOperations();
  const { series } = useSeries();
  const family = useFamilyStore((s) => s.family);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingSeries, setIsEditingSeries] = useState(false);
  const [isEditingGenres, setIsEditingGenres] = useState(false);
  const [localGenres, setLocalGenres] = useState<string[]>([]);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const subtitleColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');

  // Find the book from the current member's library
  const book = allBooks.find((b) => b.id === id) as MemberBook | undefined;

  // Sync local genres with book genres
  useEffect(() => {
    if (book?.genres) {
      setLocalGenres(book.genres);
    }
  }, [book?.genres]);

  const handleStatusChange = useCallback(
    async (newStatus: BookStatus) => {
      if (!book || book.status === newStatus) return;

      setIsUpdating(true);
      try {
        await updateBookStatus(book.libraryEntryId, newStatus);
      } catch (error) {
        console.error('Failed to update status:', error);
        Alert.alert(t('common.error'), t('books.failedToUpdateStatus'));
      } finally {
        setIsUpdating(false);
      }
    },
    [book, updateBookStatus]
  );

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0] && book && family && selectedMemberId) {
      setIsUploadingCover(true);
      try {
        const downloadUrl = await uploadBookCover(
          result.assets[0].uri,
          family.id,
          selectedMemberId,
          book.id
        );
        await updateBookMetadata(book.id, { thumbnailUrl: downloadUrl });
      } catch (error) {
        console.error('Failed to upload cover:', error);
        Alert.alert(t('common.error'), t('bookDetail.failedToUpdateCover'));
      } finally {
        setIsUploadingCover(false);
      }
    }
  }, [book, family, selectedMemberId, updateBookMetadata, t]);

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

    if (!result.canceled && result.assets[0] && book && family && selectedMemberId) {
      setIsUploadingCover(true);
      try {
        const downloadUrl = await uploadBookCover(
          result.assets[0].uri,
          family.id,
          selectedMemberId,
          book.id
        );
        await updateBookMetadata(book.id, { thumbnailUrl: downloadUrl });
      } catch (error) {
        console.error('Failed to upload cover:', error);
        Alert.alert(t('common.error'), t('bookDetail.failedToUpdateCover'));
      } finally {
        setIsUploadingCover(false);
      }
    }
  }, [book, family, selectedMemberId, updateBookMetadata, t]);

  const handleEditCover = useCallback(() => {
    Alert.alert(
      t('bookDetail.editCover'),
      t('bookDetail.chooseCoverMethod'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('member.takePhoto'), onPress: handleTakePhoto },
        { text: t('member.chooseFromLibrary'), onPress: handlePickImage },
      ]
    );
  }, [handlePickImage, handleTakePhoto, t]);

  const handleSeriesChange = useCallback(
    async (seriesId: string | undefined, seriesOrder?: number) => {
      if (!book) return;

      setIsUpdating(true);
      try {
        // Update the family book's series info
        await updateBookMetadata(book.id, { 
          seriesId: seriesId || undefined, 
          seriesOrder: seriesOrder || undefined
        });
        setIsEditingSeries(false);
      } catch (error) {
        console.error('Failed to update series:', error);
        Alert.alert(t('common.error'), t('books.failedToUpdateStatus'));
      } finally {
        setIsUpdating(false);
      }
    },
    [book, updateBookMetadata, t]
  );

  const handleGenresChange = useCallback(
    async (newGenres: string[]) => {
      if (!book) return;
      
      setLocalGenres(newGenres);
      
      // Autosave to Firestore
      try {
        await updateBookMetadata(book.id, { 
          genres: newGenres.length > 0 ? newGenres : undefined 
        });
      } catch (error) {
        console.error('Failed to update genres:', error);
        // Silently fail - user can try again
      }
    },
    [book, updateBookMetadata]
  );

  const handleDelete = useCallback(() => {
    if (!book) return;

    Alert.alert(
      t('books.removeBook'),
      t('books.removeBookConfirm', { title: book.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeBook(book.libraryEntryId);
              router.back();
            } catch (error) {
              console.error('Failed to remove book:', error);
              Alert.alert(t('common.error'), t('books.failedToRemove'));
            }
          },
        },
      ]
    );
  }, [book, removeBook, router, t]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>{t('bookDetail.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (!book) {
    return (
      <ThemedView style={styles.errorContainer}>
        <IconSymbol name="book.fill" size={64} color={subtitleColor} />
        <ThemedText style={styles.errorText}>{t('bookDetail.notFound')}</ThemedText>
        <Pressable
          style={[styles.button, { backgroundColor: primaryColor }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.buttonText}>{t('common.goBack')}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Image */}
        <View style={styles.coverSection}>
          <Pressable 
            style={[styles.coverContainer, { borderColor }]}
            onPress={handleEditCover}
            disabled={isUploadingCover}
          >
            <Image
              source={{ uri: book.thumbnailUrl || PLACEHOLDER_COVER }}
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
        </View>

        {/* Book Info */}
        <View style={[styles.infoSection, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="title" style={styles.title}>
            {book.title}
          </ThemedText>
          <ThemedText style={[styles.author, { color: subtitleColor }]}>
            {t('bookDetail.byAuthor', { author: book.author })}
          </ThemedText>
        </View>

        {/* Genres Section */}
        <View style={[styles.genresSection, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>{t('genrePicker.title')}</ThemedText>
            <Pressable onPress={() => setIsEditingGenres(!isEditingGenres)}>
              <ThemedText style={[styles.editLink, { color: primaryColor }]}>
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
            <View style={styles.genresDisplay}>
              {localGenres.length > 0 ? (
                <View style={styles.genresList}>
                  {localGenres.map((genre) => (
                    <GenreBadge key={genre} genre={genre} size="medium" />
                  ))}
                </View>
              ) : (
                <ThemedText style={[styles.noGenres, { color: subtitleColor }]}>
                  {t('genrePicker.noGenres')}
                </ThemedText>
              )}
            </View>
          )}
        </View>

        {/* Series Section */}
        <View style={[styles.seriesSection, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.seriesHeader}>
            <ThemedText style={styles.sectionTitle}>{t('bookDetail.series')}</ThemedText>
            <Pressable onPress={() => setIsEditingSeries(!isEditingSeries)}>
              <ThemedText style={[styles.editLink, { color: primaryColor }]}>
                {isEditingSeries ? t('common.done') : t('common.edit')}
              </ThemedText>
            </Pressable>
          </View>
          
          {isEditingSeries ? (
            <SeriesPicker
              selectedSeriesId={book.seriesId}
              onSeriesSelect={(seriesId, _name) => {
                handleSeriesChange(seriesId, seriesId ? (book.seriesOrder || 1) : undefined);
              }}
              seriesOrder={book.seriesOrder}
              onSeriesOrderChange={(order) => {
                if (book.seriesId) {
                  handleSeriesChange(book.seriesId, order);
                }
              }}
            />
          ) : (
            <View style={styles.seriesDisplay}>
              {book.seriesId ? (
                <>
                  <Pressable
                    style={styles.seriesLink}
                    onPress={() => router.push({ pathname: '/series/[id]', params: { id: book.seriesId! } })}
                  >
                    <IconSymbol name="books.vertical.fill" size={20} color={primaryColor} />
                    <ThemedText style={[styles.seriesName, { color: primaryColor }]}>
                      {series.find((s) => s.id === book.seriesId)?.name || t('bookDetail.unknownSeries')}
                    </ThemedText>
                  </Pressable>
                  {book.seriesOrder && (
                    <ThemedText style={[styles.seriesOrderText, { color: subtitleColor }]}>
                      {t('bookDetail.bookNumber', { number: book.seriesOrder })}
                    </ThemedText>
                  )}
                </>
              ) : (
                <ThemedText style={[styles.noSeries, { color: subtitleColor }]}>
                  {t('bookDetail.notInSeries')}
                </ThemedText>
              )}
            </View>
          )}
        </View>

        {/* Reading Status */}
        <View style={[styles.statusSection, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>{t('bookDetail.readingStatus')}</ThemedText>
          <View style={styles.statusOptions}>
            {getAllStatuses().map((status) => {
              const config = getStatusConfig(status);
              const isActive = book.status === status;
              return (
                <Pressable
                  key={status}
                  style={[
                    styles.statusOption,
                    { borderColor: config.bgColor },
                    isActive && { backgroundColor: config.bgColor },
                  ]}
                  onPress={() => handleStatusChange(status)}
                  disabled={isUpdating}
                >
                  <ThemedText
                    style={[
                      styles.statusLabel,
                      { color: isActive ? '#FFFFFF' : config.bgColor },
                    ]}
                  >
                    {t(config.label)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {isUpdating && (
            <ActivityIndicator
              size="small"
              color={primaryColor}
              style={styles.updatingIndicator}
            />
          )}
        </View>

        {/* Delete Button */}
        <Pressable
          style={[styles.deleteButton, { borderColor: '#E57373' }]}
          onPress={handleDelete}
        >
          <IconSymbol name="trash" size={20} color="#E57373" />
          <ThemedText style={styles.deleteButtonText}>{t('books.removeBook')}</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
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
  coverSection: {
    alignItems: 'center',
  },
  coverContainer: {
    width: 180,
    height: 270,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
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
  infoSection: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
  },
  author: {
    fontSize: 16,
    textAlign: 'center',
  },
  genresSection: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genresDisplay: {
    gap: 8,
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noGenres: {
    fontSize: 15,
  },
  seriesSection: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  seriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  seriesDisplay: {
    gap: 8,
  },
  seriesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seriesName: {
    fontSize: 16,
    fontWeight: '500',
  },
  seriesOrderText: {
    fontSize: 14,
    marginLeft: 28,
  },
  noSeries: {
    fontSize: 15,
  },
  statusSection: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  updatingIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 8,
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
