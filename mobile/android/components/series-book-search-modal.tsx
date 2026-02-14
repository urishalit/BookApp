import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useBookSearch } from '@/hooks/use-book-search';
import { useBookOperations } from '@/hooks/use-books';
import { useFamily } from '@/hooks/use-family';
import { useFamilyStore } from '@/stores/family-store';
import { uploadBookCover } from '@/lib/storage';
import { suggestBookMetadataFromImage } from '@/lib/book-cover-service';
import { getAllStatuses, getStatusConfig } from '@/components/book-status-badge';
import type { GoogleBookData } from '@/lib/google-books';
import type { BookStatus } from '@/types/models';

const PLACEHOLDER_COVER = 'https://via.placeholder.com/128x192/E5D4C0/8B5A2B?text=No+Cover';

type AddBooksTab = 'search' | 'add';

interface SeriesBookSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onBooksSelected: (books: GoogleBookData[]) => Promise<void>;
  existingBookIds?: string[]; // Google Books IDs already in the series
  seriesId?: string;
  nextOrder?: number;
}

interface SelectableBookItemProps {
  book: GoogleBookData;
  isSelected: boolean;
  isAlreadyInSeries: boolean;
  onToggle: () => void;
}

function SelectableBookItem({ book, isSelected, isAlreadyInSeries, onToggle }: SelectableBookItemProps) {
  const { t } = useTranslation();
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const subtitleColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');
  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const selectedBg = useThemeColor({ light: '#F5EDE4', dark: '#2A3544' }, 'background');

  return (
    <Pressable
      style={[
        styles.resultCard,
        { 
          backgroundColor: isSelected ? selectedBg : cardBg, 
          borderColor: isSelected ? primaryColor : borderColor,
          opacity: isAlreadyInSeries ? 0.5 : 1,
        },
      ]}
      onPress={isAlreadyInSeries ? undefined : onToggle}
      disabled={isAlreadyInSeries}
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
      <View style={styles.bookInfo}>
        <ThemedText style={styles.bookTitle} numberOfLines={2}>
          {book.title}
        </ThemedText>
        <ThemedText style={[styles.bookAuthor, { color: subtitleColor }]} numberOfLines={1}>
          {book.author}
        </ThemedText>
        {book.publishedDate && (
          <ThemedText style={[styles.bookMeta, { color: subtitleColor }]}>
            {book.publishedDate.substring(0, 4)}
          </ThemedText>
        )}
        {isAlreadyInSeries && (
          <ThemedText style={[styles.alreadyInSeries, { color: primaryColor }]}>
            {t('seriesBookSearch.alreadyInSeries')}
          </ThemedText>
        )}
      </View>

      {/* Selection Indicator */}
      {!isAlreadyInSeries && (
        <View style={[
          styles.checkbox,
          { 
            borderColor: isSelected ? primaryColor : borderColor,
            backgroundColor: isSelected ? primaryColor : 'transparent',
          },
        ]}>
          {isSelected && (
            <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
          )}
        </View>
      )}
    </Pressable>
  );
}

export function SeriesBookSearchModal({
  visible,
  onClose,
  onBooksSelected,
  existingBookIds = [],
  seriesId,
  nextOrder = 1,
}: SeriesBookSearchModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { selectedMemberId } = useFamily();
  const { addBook } = useBookOperations();

  const [activeTab, setActiveTab] = useState<AddBooksTab>('search');
  const [selectedBooks, setSelectedBooks] = useState<Map<string, GoogleBookData>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add book tab state
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualStatus, setManualStatus] = useState<BookStatus>('to-read');
  const [manualCoverUri, setManualCoverUri] = useState<string | null>(null);
  const [manualSeriesOrder, setManualSeriesOrder] = useState(nextOrder);
  const [manualSeriesOrderInput, setManualSeriesOrderInput] = useState(String(nextOrder));
  const suggestInFlightRef = useRef(false);

  const { query, setQuery, results, isLoading: isSearching, clearSearch } = useBookSearch();

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const inputBg = useThemeColor({ light: '#F5F0EA', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const placeholderColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const modalBg = useThemeColor({ light: '#F5F5F5', dark: '#151718' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');

  const existingIdsSet = useMemo(() => new Set(existingBookIds), [existingBookIds]);

  useEffect(() => {
    if (visible) {
      const order = typeof nextOrder === 'number' && nextOrder >= 1 ? nextOrder : 1;
      setManualSeriesOrder(order);
      setManualSeriesOrderInput(String(order));
    }
  }, [visible, nextOrder]);

  useEffect(() => {
    if (
      manualCoverUri &&
      !manualTitle.trim() &&
      !manualAuthor.trim() &&
      !suggestInFlightRef.current
    ) {
      suggestInFlightRef.current = true;
      suggestBookMetadataFromImage(manualCoverUri)
        .then((suggestions) => {
          if (suggestions.title) setManualTitle(suggestions.title);
          if (suggestions.author) setManualAuthor(suggestions.author);
          if (
            suggestions.book_number_in_series != null &&
            suggestions.book_number_in_series >= 1
          ) {
            setManualSeriesOrderInput(String(suggestions.book_number_in_series));
          }
        })
        .catch(() => {})
        .finally(() => {
          suggestInFlightRef.current = false;
        });
    }
  }, [manualCoverUri, manualTitle, manualAuthor]);

  const toggleBookSelection = useCallback((book: GoogleBookData) => {
    setSelectedBooks((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(book.googleBooksId)) {
        newMap.delete(book.googleBooksId);
      } else {
        newMap.set(book.googleBooksId, book);
      }
      return newMap;
    });
  }, []);

  const handleSearchSubmit = useCallback(async () => {
    if (selectedBooks.size === 0) return;

    setIsSubmitting(true);
    try {
      const books = Array.from(selectedBooks.values());
      await onBooksSelected(books);
      setSelectedBooks(new Map());
      clearSearch();
      // Keep modal open so user can search and add more
    } catch (error) {
      console.error('Failed to add books:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBooks, onBooksSelected, clearSearch]);

  const handleManualAddBook = useCallback(async () => {
    if (!manualTitle.trim()) {
      Alert.alert(t('common.required'), t('addBook.titleRequired'));
      return;
    }
    if (!manualAuthor.trim()) {
      Alert.alert(t('common.required'), t('addBook.authorRequired'));
      return;
    }
    const order = parseInt(manualSeriesOrderInput, 10);
    if (isNaN(order) || order < 1) {
      Alert.alert(t('common.required'), t('seriesBookSearch.bookNumberRequired'));
      return;
    }
    if (!seriesId || !selectedMemberId) return;

    setIsSubmitting(true);
    try {
      let thumbnailUrl: string | undefined;
      if (manualCoverUri) {
        const family = useFamilyStore.getState().family;
        if (family) {
          thumbnailUrl = await uploadBookCover(manualCoverUri, family.id, selectedMemberId);
        }
      }

      await addBook({
        title: manualTitle.trim(),
        author: manualAuthor.trim(),
        status: manualStatus,
        thumbnailUrl,
        seriesId,
        seriesOrder: order,
      });

      const nextOrderNum = order + 1;
      setManualTitle('');
      setManualAuthor('');
      setManualCoverUri(null);
      setManualSeriesOrder(nextOrderNum);
      setManualSeriesOrderInput(String(nextOrderNum));
    } catch (error) {
      console.error('Add book error:', error);
      const message = error instanceof Error ? error.message : 'Failed to add book';
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSubmitting(false);
    }
  }, [manualTitle, manualAuthor, manualStatus, manualCoverUri, manualSeriesOrderInput, seriesId, selectedMemberId, addBook, t]);

  const handleClose = useCallback(() => {
    setSelectedBooks(new Map());
    clearSearch();
    setActiveTab('search');
    setManualTitle('');
    setManualAuthor('');
    setManualCoverUri(null);
    setManualSeriesOrder(nextOrder);
    onClose();
  }, [clearSearch, onClose, nextOrder]);

  const renderItem = useCallback(({ item }: { item: GoogleBookData }) => {
    const isSelected = selectedBooks.has(item.googleBooksId);
    const isAlreadyInSeries = existingIdsSet.has(item.googleBooksId);

    return (
      <SelectableBookItem
        book={item}
        isSelected={isSelected}
        isAlreadyInSeries={isAlreadyInSeries}
        onToggle={() => toggleBookSelection(item)}
      />
    );
  }, [selectedBooks, existingIdsSet, toggleBookSelection]);

  const selectedCount = selectedBooks.size;

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setManualCoverUri(result.assets[0].uri);
  }, []);

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
    if (!result.canceled && result.assets[0]) setManualCoverUri(result.assets[0].uri);
  }, [t]);

  const handleImageOptions = useCallback(() => {
    Alert.alert(
      t('addBook.addCoverImage'),
      t('addBook.chooseCoverMethod'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('member.takePhoto'), onPress: handleTakePhoto },
        { text: t('member.chooseFromLibrary'), onPress: handlePickImage },
      ]
    );
  }, [handlePickImage, handleTakePhoto, t]);

  const renderAddBookTab = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.addBookContent}
    >
      <ScrollView
        style={styles.addBookScroll}
        contentContainerStyle={[styles.addBookScrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={[styles.coverContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}
          onPress={handleImageOptions}
        >
          {manualCoverUri ? (
            <Image source={{ uri: manualCoverUri }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <IconSymbol name="photo" size={40} color={placeholderColor} />
              <ThemedText style={[styles.coverPlaceholderText, { color: placeholderColor }]}>
                {t('addBook.addCover')}
              </ThemedText>
            </View>
          )}
        </Pressable>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>{t('addBook.bookTitle')}</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={manualTitle}
            onChangeText={setManualTitle}
            placeholder={t('addBook.titlePlaceholder')}
            placeholderTextColor={placeholderColor}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>{t('addBook.author')}</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={manualAuthor}
            onChangeText={setManualAuthor}
            placeholder={t('addBook.authorPlaceholder')}
            placeholderTextColor={placeholderColor}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>{t('seriesPicker.bookNumber')}</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={manualSeriesOrderInput}
            onChangeText={(text) => {
              setManualSeriesOrderInput(text);
              const parsed = parseInt(text, 10);
              if (!isNaN(parsed) && parsed >= 1) setManualSeriesOrder(parsed);
            }}
            placeholder="1"
            placeholderTextColor={placeholderColor}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>{t('addBook.readingStatus')}</ThemedText>
          <View style={[styles.statusContainer, { backgroundColor: cardBg }]}>
            {getAllStatuses().map((s) => {
              const config = getStatusConfig(s);
              const isActive = manualStatus === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.statusOption, isActive && { backgroundColor: config.bgColor }]}
                  onPress={() => setManualStatus(s)}
                >
                  <ThemedText
                    style={[styles.statusLabel, { color: isActive ? '#FFFFFF' : textColor }]}
                  >
                    {t(config.label)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.addBookFooter, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[
            styles.floatingButton,
            { backgroundColor: primaryColor },
            isSubmitting && styles.floatingButtonDisabled,
          ]}
          onPress={handleManualAddBook}
          disabled={isSubmitting || !seriesId || !selectedMemberId}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <IconSymbol name="plus.circle.fill" size={20} color="#FFFFFF" />
              <ThemedText style={styles.floatingButtonText}>{t('addBook.addBook')}</ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );

  const renderSearchTab = () => (
    <>
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: inputBg, borderColor: inputBorder },
          ]}
        >
          <IconSymbol name="magnifyingglass" size={20} color={placeholderColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('seriesBookSearch.searchPlaceholder')}
            placeholderTextColor={placeholderColor}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <IconSymbol name="xmark.circle.fill" size={20} color={placeholderColor} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item) => item.googleBooksId}
        contentContainerStyle={[styles.resultsList, { paddingBottom: insets.bottom + 80 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isSearching ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={primaryColor} />
              <ThemedText style={styles.emptyText}>{t('search.searching')}</ThemedText>
            </View>
          ) : query.length > 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="book.closed" size={48} color={placeholderColor} />
              <ThemedText style={styles.emptyText}>{t('seriesBookSearch.noResults')}</ThemedText>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol name="magnifyingglass" size={48} color={placeholderColor} />
              <ThemedText style={styles.emptyText}>{t('search.searchHint')}</ThemedText>
            </View>
          )
        }
      />

      {selectedCount > 0 && (
        <View style={[styles.floatingButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[
              styles.floatingButton,
              { backgroundColor: primaryColor },
              isSubmitting && styles.floatingButtonDisabled,
            ]}
            onPress={handleSearchSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol name="plus.circle.fill" size={20} color="#FFFFFF" />
                <ThemedText style={styles.floatingButtonText}>
                  {selectedCount === 1
                    ? t('seriesBookSearch.addOneBook')
                    : t('seriesBookSearch.addBooks', { count: selectedCount })}
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      )}
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={[styles.modal, { backgroundColor: modalBg }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16, borderColor }]}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={primaryColor} />
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            {t('seriesBookSearch.searchBooks')}
          </ThemedText>
          {activeTab === 'search' && selectedCount > 0 && (
            <View style={[styles.selectedBadge, { backgroundColor: primaryColor }]}>
              <ThemedText style={styles.selectedBadgeText}>{selectedCount}</ThemedText>
            </View>
          )}
        </View>

        {/* Tab bar */}
        <View style={[styles.tabBar, { borderColor }]}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'search' && { borderBottomColor: primaryColor, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('search')}
          >
            <IconSymbol
              name="magnifyingglass"
              size={18}
              color={activeTab === 'search' ? primaryColor : placeholderColor}
            />
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === 'search' ? primaryColor : placeholderColor },
              ]}
            >
              {t('seriesBookSearch.tabSearch')}
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'add' && { borderBottomColor: primaryColor, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('add')}
          >
            <IconSymbol
              name="plus.circle"
              size={18}
              color={activeTab === 'add' ? primaryColor : placeholderColor}
            />
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === 'add' ? primaryColor : placeholderColor },
              ]}
            >
              {t('seriesBookSearch.tabAddBook')}
            </ThemedText>
          </Pressable>
        </View>

        {/* Tab content */}
        {activeTab === 'search' ? renderSearchTab() : renderAddBookTab()}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    textAlign: 'center',
    marginRight: 40,
  },
  selectedBadge: {
    position: 'absolute',
    right: 16,
    top: '50%',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  resultsList: {
    padding: 16,
    gap: 12,
  },
  resultCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
    marginBottom: 12,
  },
  coverContainer: {
    width: 60,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5D4C0',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  bookAuthor: {
    fontSize: 13,
  },
  bookMeta: {
    fontSize: 12,
  },
  alreadyInSeries: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonDisabled: {
    opacity: 0.6,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  addBookContent: {
    flex: 1,
  },
  addBookScroll: {
    flex: 1,
  },
  addBookScrollContent: {
    padding: 16,
    gap: 16,
  },
  coverContainer: {
    width: 120,
    height: 180,
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coverPlaceholderText: {
    fontSize: 14,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
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
  addBookFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
});

