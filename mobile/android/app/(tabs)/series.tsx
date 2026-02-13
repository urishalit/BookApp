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
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SeriesCard } from '@/components/series-card';
import { MemberPicker } from '@/components/member-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSeries, useSeriesOperations, SeriesWithProgress } from '@/hooks/use-series';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SeriesScreen() {
  const { t } = useTranslation();
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
            {t('series.series', { count: totalSeries })} •{' '}
            {series.filter((s) => s.progressPercent === 100).length} {t('series.completed')}
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

