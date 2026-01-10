import React, { useCallback, useState } from 'react';
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
import { SeriesCard } from '@/components/series-card';
import { MemberAvatar } from '@/components/member-avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSeries, useSeriesOperations, SeriesWithProgress } from '@/hooks/use-series';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SeriesScreen() {
  const router = useRouter();
  const { family, selectedMember, selectedMemberId } = useFamily();
  const { series, isLoading, error, totalSeries } = useSeries();
  const { removeSeries, addSeriesToLibrary } = useSeriesOperations();
  const [addingSeriesId, setAddingSeriesId] = useState<string | null>(null);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1A2129' }, 'background');

  const handleSeriesPress = useCallback(
    (item: SeriesWithProgress) => {
      router.push({
        pathname: '/series/[id]',
        params: { id: item.id },
      });
    },
    [router]
  );

  const handleDeleteSeries = useCallback(
    (item: SeriesWithProgress) => {
      Alert.alert(
        'Delete Series',
        `Are you sure you want to delete "${item.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeSeries(item.id);
              } catch (err) {
                Alert.alert('Error', 'Failed to delete series');
              }
            },
          },
        ]
      );
    },
    [removeSeries]
  );

  const handleAddSeries = useCallback(() => {
    router.push('/series/create');
  }, [router]);

  const handleSelectMember = useCallback(() => {
    router.push('/(tabs)/family');
  }, [router]);

  const handleAddToLibrary = useCallback(
    async (item: SeriesWithProgress) => {
      if (!selectedMemberId) {
        Alert.alert(
          'Select Member',
          'Please select a family member first to add series to their library.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Family', onPress: () => router.push('/(tabs)/family') },
          ]
        );
        return;
      }

      setAddingSeriesId(item.id);
      try {
        const result = await addSeriesToLibrary(item.id);
        if (result.added > 0) {
          Alert.alert(
            'Added to Library',
            `Added ${result.added} book${result.added === 1 ? '' : 's'} to ${selectedMember?.name}'s library.${
              result.skipped > 0 ? ` (${result.skipped} already in library)` : ''
            }`
          );
        } else if (result.skipped > 0) {
          Alert.alert('Already in Library', 'All books from this series are already in your library.');
        } else {
          Alert.alert('No Books', 'This series has no books yet. Add books to the series first.');
        }
      } catch (err) {
        console.error('Failed to add series to library:', err);
        Alert.alert('Error', 'Failed to add series to library. Please try again.');
      } finally {
        setAddingSeriesId(null);
      }
    },
    [selectedMemberId, selectedMember, addSeriesToLibrary, router]
  );

  const renderSeries = useCallback(
    ({ item }: { item: SeriesWithProgress }) => (
      <SeriesCard
        series={item}
        onPress={() => handleSeriesPress(item)}
        onLongPress={() => handleDeleteSeries(item)}
        onAddToLibrary={() => handleAddToLibrary(item)}
        showAddButton={!!selectedMemberId}
      />
    ),
    [handleSeriesPress, handleDeleteSeries, handleAddToLibrary, selectedMemberId]
  );

  const renderEmptyState = () => {
    if (!family) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
            <IconSymbol name="house.fill" size={64} color={primaryColor} />
          </View>
          <ThemedText type="title" style={styles.emptyTitle}>
            Set Up Your Family
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            Create your family to start tracking book series.
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
          <IconSymbol name="books.vertical.fill" size={64} color={primaryColor} />
        </View>
        <ThemedText type="title" style={styles.emptyTitle}>
          No Series Yet
        </ThemedText>
        <ThemedText style={styles.emptyText}>
          Create a series to track your progress through multi-book adventures!
          {!selectedMemberId && '\n\nSelect a member to see their progress.'}
        </ThemedText>
        <Pressable
          style={[styles.emptyButton, { backgroundColor: primaryColor }]}
          onPress={handleAddSeries}
        >
          <IconSymbol name="plus" size={20} color="#FFFFFF" />
          <ThemedText style={styles.emptyButtonText}>Create First Series</ThemedText>
        </Pressable>
      </View>
    );
  };

  if (isLoading && series.length === 0 && family) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>Loading series...</ThemedText>
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
            Series
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
        {family && (
          <Pressable
            style={[styles.addButton, { backgroundColor: primaryColor }]}
            onPress={handleAddSeries}
          >
            <IconSymbol name="plus" size={24} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {/* Stats Bar */}
      {family && totalSeries > 0 && (
        <View style={styles.statsBar}>
          <ThemedText style={styles.statsText}>
            {totalSeries} {totalSeries === 1 ? 'series' : 'series'} •{' '}
            {series.filter((s) => s.progressPercent === 100).length} completed
          </ThemedText>
        </View>
      )}

      {/* Series List */}
      <FlatList
        data={series}
        renderItem={renderSeries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          series.length === 0 ? styles.emptyList : styles.list
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
  statsBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  statsText: {
    fontSize: 14,
    opacity: 0.6,
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

