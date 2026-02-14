import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SeriesCard } from '@/components/series-card';
import { MemberPicker } from '@/components/member-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSeries, useSeriesOperations, SeriesWithProgress } from '@/hooks/use-series';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import { filterSeries, type LibraryTab } from '@/lib/series-filter-utils';
import type { SeriesStatus } from '@/types/models';

export default function SeriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { family, selectedMember, selectedMemberId } = useFamily();
  const { series, isLoading, error, totalSeries } = useSeries();
  const { removeSeries, addSeriesToLibrary, updateSeriesStatus } = useSeriesOperations();
  const [addingSeriesId, setAddingSeriesId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryTab>('inLibrary');
  const [statusFilter, setStatusFilter] = useState<SeriesStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const displayedSeries = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (trimmedQuery) {
      return series.filter((s) => s.name.toLowerCase().includes(trimmedQuery));
    }
    if (!selectedMemberId) {
      return series;
    }
    return filterSeries(series, activeTab, searchQuery, statusFilter);
  }, [series, activeTab, searchQuery, selectedMemberId, statusFilter]);

  const inLibraryCount = useMemo(
    () => series.filter((s) => s.isInLibrary).length,
    [series]
  );
  const notInLibraryCount = useMemo(
    () => series.filter((s) => !s.isInLibrary).length,
    [series]
  );
  const completedInLibraryCount = useMemo(
    () => series.filter((s) => s.isInLibrary && s.progressPercent === 100).length,
    [series]
  );

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1A2129' }, 'background');
  const inputBg = useThemeColor({ light: '#F5F0EA', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const placeholderColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const inactiveTabColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const tabBorderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'background');

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
        t('series.deleteSeries'),
        t('series.deleteSeriesConfirm', { name: item.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await removeSeries(item.id);
              } catch (err) {
                Alert.alert(t('common.error'), t('series.failedToDelete'));
              }
            },
          },
        ]
      );
    },
    [removeSeries, t]
  );

  const handleAddSeries = useCallback(() => {
    router.push('/series/create');
  }, [router]);

  const handleAddToLibrary = useCallback(
    async (item: SeriesWithProgress) => {
      if (!selectedMemberId) {
        Alert.alert(
          t('series.selectMember'),
          t('series.selectMemberMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.add'), onPress: () => router.push('/family-management') },
          ]
        );
        return;
      }

      setAddingSeriesId(item.id);
      try {
        const result = await addSeriesToLibrary(item.id);
        if (result.added > 0) {
          const skippedText = result.skipped > 0 ? ` ${t('series.skippedMessage', { count: result.skipped })}` : '';
          Alert.alert(
            t('series.addedToLibrary'),
            t('series.addedBooksMessage', { count: result.added, name: selectedMember?.name }) + skippedText
          );
        } else if (result.skipped > 0) {
          Alert.alert(t('series.alreadyInLibrary'), t('series.allBooksInLibrary'));
        } else {
          Alert.alert(t('series.noBooks'), t('series.noBooksInSeries'));
        }
      } catch (err) {
        console.error('Failed to add series to library:', err);
        Alert.alert(t('common.error'), t('series.failedToAddToLibrary'));
      } finally {
        setAddingSeriesId(null);
      }
    },
    [selectedMemberId, selectedMember, addSeriesToLibrary, router, t]
  );

  const handleSeriesStatusChange = useCallback(
    async (item: SeriesWithProgress, status: import('@/types/models').SeriesStatus) => {
      try {
        await updateSeriesStatus(item.id, status);
      } catch (err) {
        Alert.alert(t('common.error'), t('seriesDetail.failedToUpdate'));
      }
    },
    [updateSeriesStatus, t]
  );

  const renderSeries = useCallback(
    ({ item }: { item: SeriesWithProgress }) => (
      <SeriesCard
        series={item}
        onPress={() => handleSeriesPress(item)}
        onLongPress={() => handleDeleteSeries(item)}
        onAddToLibrary={() => handleAddToLibrary(item)}
        onStatusChange={(status) => handleSeriesStatusChange(item, status)}
        showAddButton={!!selectedMemberId}
      />
    ),
    [handleSeriesPress, handleDeleteSeries, handleAddToLibrary, handleSeriesStatusChange, selectedMemberId]
  );

  const renderEmptyState = () => {
    if (!family) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
            <IconSymbol name="house.fill" size={64} color={primaryColor} />
          </View>
          <ThemedText type="title" style={styles.emptyTitle}>
            {t('series.setUpFamily')}
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            {t('series.setUpFamilyDescription')}
          </ThemedText>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: primaryColor }]}
            onPress={() => router.push('/family-management')}
          >
            <ThemedText style={styles.emptyButtonText}>{t('family.addFirstMember')}</ThemedText>
          </Pressable>
        </View>
      );
    }

    if (totalSeries === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
            <IconSymbol name="books.vertical.fill" size={64} color={primaryColor} />
          </View>
          <ThemedText type="title" style={styles.emptyTitle}>
            {t('series.noSeriesYet')}
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            {t('series.noSeriesDescription')}
          </ThemedText>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: primaryColor }]}
            onPress={handleAddSeries}
          >
            <IconSymbol name="plus" size={20} color="#FFFFFF" />
            <ThemedText style={styles.emptyButtonText}>{t('series.createFirstSeries')}</ThemedText>
          </Pressable>
        </View>
      );
    }

    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
            <IconSymbol name="magnifyingglass" size={64} color={primaryColor} />
          </View>
          <ThemedText type="title" style={styles.emptyTitle}>
            {t('series.noSearchResults')}
          </ThemedText>
        </View>
      );
    }

    if (activeTab === 'inLibrary' && inLibraryCount === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
            <IconSymbol name="books.vertical.fill" size={64} color={primaryColor} />
          </View>
          <ThemedText type="title" style={styles.emptyTitle}>
            {t('series.noSeriesInLibraryYet')}
          </ThemedText>
        </View>
      );
    }

    if (activeTab === 'notInLibrary' && notInLibraryCount === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: cardBg }]}>
            <IconSymbol name="checkmark.circle.fill" size={64} color={primaryColor} />
          </View>
          <ThemedText type="title" style={styles.emptyTitle}>
            {t('series.allSeriesInLibrary')}
          </ThemedText>
        </View>
      );
    }

    return null;
  };

  if (isLoading && series.length === 0 && family) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>{t('series.loadingSeries')}</ThemedText>
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
            {t('series.title')}
          </ThemedText>
          <MemberPicker />
        </View>
        <View style={styles.headerRight}>
          {family && (
            <Pressable
              style={[styles.addButton, { backgroundColor: primaryColor }]}
              onPress={handleAddSeries}
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

      {/* Stats Bar */}
      {family && totalSeries > 0 && (
        <View style={styles.statsBar}>
          <ThemedText style={styles.statsText}>
            {searchQuery.trim()
              ? t('series.series', { count: displayedSeries.length })
              : activeTab === 'inLibrary'
                ? `${t('series.series', { count: displayedSeries.length })} • ${completedInLibraryCount} ${t('series.completed')}`
                : t('series.series', { count: displayedSeries.length })}
          </ThemedText>
        </View>
      )}

      {/* Search Bar */}
      {family && (
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
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('series.searchPlaceholder')}
              placeholderTextColor={placeholderColor}
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <IconSymbol name="xmark.circle.fill" size={20} color={placeholderColor} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Status filter tabs (when in library) */}
      {family && selectedMemberId && activeTab === 'inLibrary' && inLibraryCount > 0 && (
        <View style={[styles.statusTabContainer, { borderColor: tabBorderColor }]}>
          {(['all', 'reading', 'to-read', 'read', 'stopped'] as const).map((s) => (
            <Pressable
              key={s}
              style={[
                styles.statusTab,
                statusFilter === s && { borderBottomColor: primaryColor, borderBottomWidth: 2 },
              ]}
              onPress={() => setStatusFilter(s)}
            >
              <ThemedText
                style={[
                  styles.statusTabLabel,
                  { color: statusFilter === s ? primaryColor : inactiveTabColor },
                ]}
                numberOfLines={1}
              >
                {s === 'all' ? t('books.all') : t(`seriesStatus.${s === 'to-read' ? 'toRead' : s}`)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      {/* Tabs */}
      {family && selectedMemberId && (
        <View style={[styles.tabContainer, { borderColor: tabBorderColor }]}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'inLibrary' && { borderBottomColor: primaryColor, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('inLibrary')}
          >
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === 'inLibrary' ? primaryColor : inactiveTabColor },
                activeTab === 'inLibrary' && styles.tabLabelActive,
              ]}
            >
              {t('series.inLibrary')}
            </ThemedText>
            {inLibraryCount > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: activeTab === 'inLibrary' ? primaryColor : inactiveTabColor },
                ]}
              >
                <ThemedText style={styles.tabBadgeText}>{inLibraryCount}</ThemedText>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'notInLibrary' && { borderBottomColor: primaryColor, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('notInLibrary')}
          >
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === 'notInLibrary' ? primaryColor : inactiveTabColor },
                activeTab === 'notInLibrary' && styles.tabLabelActive,
              ]}
            >
              {t('series.notInLibrary')}
            </ThemedText>
            {notInLibraryCount > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: activeTab === 'notInLibrary' ? primaryColor : inactiveTabColor },
                ]}
              >
                <ThemedText style={styles.tabBadgeText}>{notInLibraryCount}</ThemedText>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* Series List */}
      <FlatList
        data={displayedSeries}
        renderItem={renderSeries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          displayedSeries.length === 0 ? styles.emptyList : styles.list
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
  statsBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  statsText: {
    fontSize: 14,
    opacity: 0.6,
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
  statusTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  statusTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  statusTabLabel: {
    fontSize: 12,
    fontWeight: '500',
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

