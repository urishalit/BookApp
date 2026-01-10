import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useBookSearch } from '@/hooks/use-book-search';
import { useFamily } from '@/hooks/use-family';
import type { GoogleBookData } from '@/lib/google-books';

const PLACEHOLDER_COVER = 'https://via.placeholder.com/128x192/E5D4C0/8B5A2B?text=No+Cover';

function SearchResultItem({ 
  book, 
  onPress 
}: { 
  book: GoogleBookData; 
  onPress: () => void;
}) {
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const subtitleColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');
  const accentColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultCard,
        { 
          backgroundColor: cardBg, 
          borderColor,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={onPress}
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
      </View>

      {/* Add Button */}
      <View style={[styles.addButton, { backgroundColor: accentColor }]}>
        <IconSymbol name="plus" size={20} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedMember } = useFamily();

  const {
    query,
    setQuery,
    clearSearch,
    results,
    isLoading,
    error,
    hasSearched,
  } = useBookSearch(400);

  const backgroundColor = useThemeColor({}, 'background');
  const inputBg = useThemeColor({ light: '#F5F0EA', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const placeholderColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');

  const handleBookPress = useCallback((book: GoogleBookData) => {
    Keyboard.dismiss();
    // Navigate to add-from-search with book data
    router.push({
      pathname: '/book/add-from-search',
      params: {
        googleBooksId: book.googleBooksId,
        title: book.title,
        author: book.author,
        thumbnailUrl: book.thumbnailUrl || '',
        description: book.description || '',
        pageCount: book.pageCount?.toString() || '',
        publishedDate: book.publishedDate || '',
      },
    });
  }, [router]);

  const renderItem = useCallback(({ item }: { item: GoogleBookData }) => (
    <SearchResultItem book={item} onPress={() => handleBookPress(item)} />
  ), [handleBookPress]);

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={accentColor} />
          <ThemedText style={styles.stateText}>{t('search.searching')}</ThemedText>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerState}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={accentColor} />
          <ThemedText style={styles.stateText}>{error}</ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={() => setQuery(query)}
          >
            <ThemedText style={styles.retryButtonText}>{t('common.tryAgain')}</ThemedText>
          </Pressable>
        </View>
      );
    }

    if (hasSearched && results.length === 0) {
      return (
        <View style={styles.centerState}>
          <IconSymbol name="book.closed" size={48} color={placeholderColor} />
          <ThemedText style={styles.stateText}>{t('search.noBooksFound')}</ThemedText>
          <ThemedText style={[styles.stateSubtext, { color: placeholderColor }]}>
            {t('search.tryDifferentTerm')}
          </ThemedText>
        </View>
      );
    }

    // Initial state - no search yet
    return (
      <View style={styles.centerState}>
        <IconSymbol name="magnifyingglass" size={48} color={placeholderColor} />
        <ThemedText style={styles.stateText}>{t('search.searchForBooks')}</ThemedText>
        <ThemedText style={[styles.stateSubtext, { color: placeholderColor }]}>
          {t('search.searchHint')}
        </ThemedText>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>{t('search.title')}</ThemedText>
        {selectedMember && (
          <ThemedText style={[styles.memberInfo, { color: placeholderColor }]}>
            {t('search.addingFor', { name: selectedMember.name })}
          </ThemedText>
        )}
      </View>

      {/* Search Input */}
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
            placeholder={t('search.placeholder')}
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

      {/* Results or Empty State */}
      {!selectedMember ? (
        <View style={styles.centerState}>
          <IconSymbol name="person.crop.circle.badge.exclamationmark" size={48} color={accentColor} />
          <ThemedText style={styles.stateText}>{t('search.selectMemberFirst')}</ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={() => router.push('/(tabs)/family')}
          >
            <ThemedText style={styles.retryButtonText}>{t('common.goToFamily')}</ThemedText>
          </Pressable>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.googleBooksId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
  },
  memberInfo: {
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  listContent: {
    paddingBottom: 24,
  },
  resultCard: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  coverContainer: {
    width: 56,
    height: 84,
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
    marginLeft: 14,
    paddingRight: 8,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  bookAuthor: {
    fontSize: 13,
    marginTop: 4,
  },
  bookMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  stateText: {
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
  },
  stateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
