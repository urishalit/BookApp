import React, { useState, useEffect, useCallback } from 'react';
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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SeriesPicker } from '@/components/series-picker';
import { getAllStatuses, getStatusConfig } from '@/components/book-status-badge';
import { useBookOperations } from '@/hooks/use-books';
import { useSeries } from '@/hooks/use-series';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Book, BookStatus } from '@/types/models';

const PLACEHOLDER_COVER = 'https://via.placeholder.com/256x384/E5D4C0/8B5A2B?text=No+Cover';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { fetchBook, updateBookStatus, editBook, removeBook } = useBookOperations();
  const { series } = useSeries();

  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingSeries, setIsEditingSeries] = useState(false);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const subtitleColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');

  useEffect(() => {
    if (!id) return;

    async function loadBook() {
      try {
        setIsLoading(true);
        const bookData = await fetchBook(id);
        setBook(bookData);
      } catch (error) {
        console.error('Failed to load book:', error);
        Alert.alert('Error', 'Failed to load book details');
      } finally {
        setIsLoading(false);
      }
    }

    loadBook();
  }, [id, fetchBook]);

  const handleStatusChange = useCallback(
    async (newStatus: BookStatus) => {
      if (!book || book.status === newStatus) return;

      setIsUpdating(true);
      try {
        await updateBookStatus(book.id, newStatus);
        setBook((prev) => (prev ? { ...prev, status: newStatus } : null));
      } catch (error) {
        console.error('Failed to update status:', error);
        Alert.alert('Error', 'Failed to update book status');
      } finally {
        setIsUpdating(false);
      }
    },
    [book, updateBookStatus]
  );

  const handleSeriesChange = useCallback(
    async (seriesId: string | undefined, seriesOrder?: number) => {
      if (!book) return;

      setIsUpdating(true);
      try {
        await editBook(book.id, { 
          seriesId: seriesId || null as any, 
          seriesOrder: seriesOrder || null as any 
        });
        setBook((prev) => (prev ? { ...prev, seriesId, seriesOrder } : null));
        setIsEditingSeries(false);
      } catch (error) {
        console.error('Failed to update series:', error);
        Alert.alert('Error', 'Failed to update book series');
      } finally {
        setIsUpdating(false);
      }
    },
    [book, editBook]
  );

  const handleDelete = useCallback(() => {
    if (!book) return;

    Alert.alert(
      'Delete Book',
      `Are you sure you want to delete "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeBook(book.id);
              router.back();
            } catch (error) {
              console.error('Failed to delete book:', error);
              Alert.alert('Error', 'Failed to delete book');
            }
          },
        },
      ]
    );
  }, [book, removeBook, router]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>Loading book...</ThemedText>
      </ThemedView>
    );
  }

  if (!book) {
    return (
      <ThemedView style={styles.errorContainer}>
        <IconSymbol name="book.fill" size={64} color={subtitleColor} />
        <ThemedText style={styles.errorText}>Book not found</ThemedText>
        <Pressable
          style={[styles.button, { backgroundColor: primaryColor }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.buttonText}>Go Back</ThemedText>
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
          <View style={[styles.coverContainer, { borderColor }]}>
            <Image
              source={{ uri: book.thumbnailUrl || PLACEHOLDER_COVER }}
              style={styles.coverImage}
              contentFit="cover"
              transition={300}
            />
          </View>
        </View>

        {/* Book Info */}
        <View style={[styles.infoSection, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="title" style={styles.title}>
            {book.title}
          </ThemedText>
          <ThemedText style={[styles.author, { color: subtitleColor }]}>
            by {book.author}
          </ThemedText>
        </View>

        {/* Series Section */}
        <View style={[styles.seriesSection, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.seriesHeader}>
            <ThemedText style={styles.sectionTitle}>Series</ThemedText>
            <Pressable onPress={() => setIsEditingSeries(!isEditingSeries)}>
              <ThemedText style={[styles.editLink, { color: primaryColor }]}>
                {isEditingSeries ? 'Done' : 'Edit'}
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
                      {series.find((s) => s.id === book.seriesId)?.name || 'Unknown Series'}
                    </ThemedText>
                  </Pressable>
                  {book.seriesOrder && (
                    <ThemedText style={[styles.seriesOrderText, { color: subtitleColor }]}>
                      Book #{book.seriesOrder}
                    </ThemedText>
                  )}
                </>
              ) : (
                <ThemedText style={[styles.noSeries, { color: subtitleColor }]}>
                  Not part of a series
                </ThemedText>
              )}
            </View>
          )}
        </View>

        {/* Reading Status */}
        <View style={[styles.statusSection, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Reading Status</ThemedText>
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
                    {config.label}
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
          <ThemedText style={styles.deleteButtonText}>Delete Book</ThemedText>
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

