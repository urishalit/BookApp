import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BookCard } from '@/components/book-card';
import { SeriesRow } from '@/components/series-row';
import { MemberPicker } from '@/components/member-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useBooks, useBookOperations, getNextStatus } from '@/hooks/use-books';
import { useSeries } from '@/hooks/use-series';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import { groupBooksBySeries, getBookListItemKey, type BookListItem } from '@/lib/book-list-utils';
import type { MemberBook, BookStatus, Series } from '@/types/models';

type FilterTab = 'all' | BookStatus;

export default function BooksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  
  const { selectedMember, selectedMemberId } = useFamily();
  const { books, counts, isLoading, error } = useBooks(activeFilter);
  const { series: seriesWithProgress } = useSeries();
  const { removeBook, updateBookStatus } = useBookOperations();

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1A2129' }, 'background');
  const inactiveTabColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const tabBorderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'background');

  /**
   * Group books by series and create a combined list of items.
   * Books with a seriesId are collapsed into a single SeriesRow.
   * Books without a seriesId are shown as individual BookCards.
   * Uses complete series data for accurate progress even when filtered.
   */
  const listItems = useMemo(
    () => groupBooksBySeries(books, seriesWithProgress),
    [books, seriesWithProgress]
  );

  const handleBookPress = useCallback(
    (book: MemberBook) => {
      router.push({
        pathname: '/book/[id]',
        params: { id: book.id },
      });
    },
    [router]
  );

  const handleSeriesPress = useCallback(
    (series: Series) => {
      router.push({
        pathname: '/series/[id]',
        params: { id: series.id },
      });
    },
    [router]
  );

  const handleStatusPress = useCallback(
    async (book: MemberBook) => {
      const nextStatus = getNextStatus(book.status);
      try {
        await updateBookStatus(book.libraryEntryId, nextStatus);
      } catch (err) {
        Alert.alert(t('common.error'), t('books.failedToUpdateStatus'));
      }
    },
    [updateBookStatus, t]
  );

  const handleDeleteBook = useCallback(
    (book: MemberBook) => {
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
              } catch (err) {
                Alert.alert(t('common.error'), t('books.failedToRemove'));
              }
            },
          },
        ]
      );
    },
    [removeBook, t]
  );

  const handleAddBook = useCallback(() => {
    router.push('/book/add');
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: BookListItem }) => {
      if (item.type === 'series') {
        return (
          <SeriesRow
            series={item.series}
            booksInSeries={item.books}
            onPress={() => handleSeriesPress(item.series)}
          />
        );
      }
      return (
        <BookCard
          book={item.book}
          onPress={() => handleBookPress(item.book)}
          onLongPress={() => handleDeleteBook(item.book)}
          onStatusPress={() => handleStatusPress(item.book)}
        />
      );
    },
    [handleBookPress, handleSeriesPress, handleDeleteBook, handleStatusPress]
  );

  const renderEmptyState = () => {
    if (!selectedMemberId) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
            <IconSymbol name="person.3.fill" size={64} color={primaryColor} />
          </View>
          <ThemedText type="title" style={styles.emptyTitle}>
            {t('family.noMembersYet')}
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            {t('family.noMembersDescription')}
          </ThemedText>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: primaryColor }]}
            onPress={() => router.push('/family-management')}
          >
            <IconSymbol name="plus" size={20} color="#FFFFFF" />
            <ThemedText style={styles.emptyButtonText}>{t('family.addFirstMember')}</ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
          <IconSymbol name="book.fill" size={64} color={primaryColor} />
        </View>
        <ThemedText type="title" style={styles.emptyTitle}>
          {t('books.noBooksYet')}
        </ThemedText>
        <ThemedText style={styles.emptyText}>
          {activeFilter === 'all'
            ? t('books.addBooksToStart')
            : t('books.noBooksWithStatus', { status: t(`bookStatus.${activeFilter === 'to-read' ? 'toRead' : activeFilter}`) })}
        </ThemedText>
        {activeFilter === 'all' && (
          <Pressable
            style={[styles.emptyButton, { backgroundColor: primaryColor }]}
            onPress={handleAddBook}
          >
            <IconSymbol name="plus" size={20} color="#FFFFFF" />
            <ThemedText style={styles.emptyButtonText}>{t('books.addFirstBook')}</ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  const filterTabs: { key: FilterTab; labelKey: string }[] = [
    { key: 'all', labelKey: 'books.all' },
    { key: 'reading', labelKey: 'bookStatus.reading' },
    { key: 'to-read', labelKey: 'bookStatus.toRead' },
    { key: 'read', labelKey: 'bookStatus.read' },
  ];

  const renderFilterTabs = () => (
    <View style={[styles.tabContainer, { borderColor: tabBorderColor }]}>
      {filterTabs.map((tab) => {
        const isActive = activeFilter === tab.key;
        const count = counts[tab.key];
        
        return (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              isActive && { borderBottomColor: primaryColor, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <ThemedText
              style={[
                styles.tabLabel,
                { color: isActive ? primaryColor : inactiveTabColor },
                isActive && styles.tabLabelActive,
              ]}
            >
              {t(tab.labelKey)}
            </ThemedText>
            {count > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: isActive ? primaryColor : inactiveTabColor },
                ]}
              >
                <ThemedText style={styles.tabBadgeText}>{count}</ThemedText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  if (isLoading && books.length === 0 && selectedMemberId) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>{t('books.loadingBooks')}</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#E57373" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText type="title" style={styles.headerTitle}>
            {t('books.title')}
          </ThemedText>
          <MemberPicker />
        </View>
        <View style={styles.headerRight}>
          {selectedMemberId && (
            <Pressable
              style={[styles.addButton, { backgroundColor: primaryColor }]}
              onPress={handleAddBook}
            >
              <IconSymbol name="plus" size={24} color="#FFFFFF" />
            </Pressable>
          )}
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <IconSymbol name="gearshape.fill" size={24} color={primaryColor} />
          </Pressable>
        </View>
      </View>

      {/* Filter Tabs */}
      {selectedMemberId && renderFilterTabs()}

      {/* Books List */}
      <FlatList
        data={listItems}
        renderItem={renderItem}
        keyExtractor={getBookListItemKey}
        contentContainerStyle={
          listItems.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    textAlign: 'center',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  list: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
