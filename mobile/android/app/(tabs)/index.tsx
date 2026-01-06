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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BookCard } from '@/components/book-card';
import { MemberAvatar } from '@/components/member-avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useBooks, useBookOperations } from '@/hooks/use-books';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Book, BookStatus } from '@/types/models';

type FilterTab = 'all' | BookStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reading', label: 'Reading' },
  { key: 'to-read', label: 'To Read' },
  { key: 'read', label: 'Read' },
];

export default function BooksScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  
  const { selectedMember, selectedMemberId } = useFamily();
  const { books, counts, isLoading, error } = useBooks(activeFilter);
  const { removeBook, updateBookStatus } = useBookOperations();

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1A2129' }, 'background');
  const inactiveTabColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const tabBorderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'background');

  const handleBookPress = useCallback(
    (book: Book) => {
      router.push({
        pathname: '/book/[id]',
        params: { id: book.id },
      });
    },
    [router]
  );

  const handleStatusPress = useCallback(
    (book: Book) => {
      const statusOptions: BookStatus[] = ['reading', 'to-read', 'read'];
      const currentIndex = statusOptions.indexOf(book.status);
      const nextStatus = statusOptions[(currentIndex + 1) % statusOptions.length];
      
      Alert.alert(
        'Change Status',
        `Update "${book.title}" status to:`,
        [
          { text: 'Cancel', style: 'cancel' },
          ...statusOptions.map((status) => ({
            text: status === 'reading' ? 'Reading' : status === 'to-read' ? 'To Read' : 'Read',
            onPress: async () => {
              try {
                await updateBookStatus(book.id, status);
              } catch (err) {
                Alert.alert('Error', 'Failed to update book status');
              }
            },
          })),
        ]
      );
    },
    [updateBookStatus]
  );

  const handleDeleteBook = useCallback(
    (book: Book) => {
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
              } catch (err) {
                Alert.alert('Error', 'Failed to delete book');
              }
            },
          },
        ]
      );
    },
    [removeBook]
  );

  const handleAddBook = useCallback(() => {
    router.push('/book/add');
  }, [router]);

  const handleSelectMember = useCallback(() => {
    router.push('/(tabs)/family');
  }, [router]);

  const renderBook = useCallback(
    ({ item }: { item: Book }) => (
      <BookCard
        book={item}
        onPress={() => handleBookPress(item)}
        onLongPress={() => handleDeleteBook(item)}
        onStatusPress={() => handleStatusPress(item)}
      />
    ),
    [handleBookPress, handleDeleteBook, handleStatusPress]
  );

  const renderEmptyState = () => {
    if (!selectedMemberId) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
            <IconSymbol name="person.3.fill" size={64} color={primaryColor} />
          </View>
          <ThemedText type="title" style={styles.emptyTitle}>
            Select a Family Member
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            Choose a family member from the Family tab to view and manage their books.
          </ThemedText>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: primaryColor }]}
            onPress={handleSelectMember}
          >
            <ThemedText style={styles.emptyButtonText}>Go to Family</ThemedText>
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
          No Books Yet
        </ThemedText>
        <ThemedText style={styles.emptyText}>
          {activeFilter === 'all'
            ? "Add some books to start tracking!"
            : `No books with "${activeFilter}" status.`}
        </ThemedText>
        {activeFilter === 'all' && (
          <Pressable
            style={[styles.emptyButton, { backgroundColor: primaryColor }]}
            onPress={handleAddBook}
          >
            <IconSymbol name="plus" size={20} color="#FFFFFF" />
            <ThemedText style={styles.emptyButtonText}>Add First Book</ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  const renderFilterTabs = () => (
    <View style={[styles.tabContainer, { borderColor: tabBorderColor }]}>
      {FILTER_TABS.map((tab) => {
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
              {tab.label}
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
        <ThemedText style={styles.loadingText}>Loading books...</ThemedText>
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
            Books
          </ThemedText>
          {selectedMember && (
            <Pressable style={styles.memberInfo} onPress={handleSelectMember}>
              <MemberAvatar
                name={selectedMember.name}
                color={selectedMember.color}
                avatarUrl={selectedMember.avatarUrl}
                size="small"
              />
              <ThemedText style={styles.memberName} numberOfLines={1}>
                {selectedMember.name}
              </ThemedText>
            </Pressable>
          )}
        </View>
        {selectedMemberId && (
          <Pressable
            style={[styles.addButton, { backgroundColor: primaryColor }]}
            onPress={handleAddBook}
          >
            <IconSymbol name="plus" size={24} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      {selectedMemberId && renderFilterTabs()}

      {/* Books List */}
      <FlatList
        data={books}
        renderItem={renderBook}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          books.length === 0 ? styles.emptyList : styles.list
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
  headerTitle: {
    fontSize: 28,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    opacity: 0.7,
    fontSize: 14,
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
