import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Modal, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSeries, useSeriesOperations, SeriesWithProgress } from '@/hooks/use-series';

interface SeriesPickerProps {
  selectedSeriesId?: string;
  onSeriesSelect: (seriesId: string | undefined, seriesOrder?: number) => void;
  seriesOrder?: number;
  onSeriesOrderChange?: (order: number | undefined) => void;
}

export function SeriesPicker({
  selectedSeriesId,
  onSeriesSelect,
  seriesOrder,
  onSeriesOrderChange,
}: SeriesPickerProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { series } = useSeries();

  const filteredSeries = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return series;
    return series.filter((s) => s.name.toLowerCase().includes(trimmed));
  }, [series, searchQuery]);
  const { addSeries } = useSeriesOperations();

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const subtitleColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');
  const modalBg = useThemeColor({ light: '#F5F5F5', dark: '#151718' }, 'background');
  const inputBg = useThemeColor({ light: '#FFFFFF', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const placeholderColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const selectedSeries = series.find((s) => s.id === selectedSeriesId);

  const handleCreateSeries = useCallback(async () => {
    const trimmedName = newSeriesName.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    try {
      const seriesId = await addSeries({ name: trimmedName, totalBooks: 0 });
      // Pass seriesId and order 1 (first book in new series)
      onSeriesSelect(seriesId, 1);
      setNewSeriesName('');
      setIsCreating(false);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create series:', error);
      Alert.alert(t('common.error'), t('seriesPicker.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  }, [newSeriesName, addSeries, onSeriesSelect, t]);

  const handleCancelCreate = useCallback(() => {
    setNewSeriesName('');
    setIsCreating(false);
  }, []);

  const handleSelect = (item: SeriesWithProgress | null) => {
    if (item) {
      // Pass seriesId and suggested order (next book number)
      const suggestedOrder = item.booksOwned + 1;
      onSeriesSelect(item.id, suggestedOrder);
    } else {
      onSeriesSelect(undefined, undefined);
    }
    setIsModalOpen(false);
  };

  const renderSeriesItem = ({ item }: { item: SeriesWithProgress }) => {
    const isSelected = item.id === selectedSeriesId;
    return (
      <Pressable
        style={[
          styles.seriesItem,
          { backgroundColor: cardBg, borderColor },
          isSelected && { borderColor: primaryColor, borderWidth: 2 },
        ]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.seriesItemContent}>
          <IconSymbol
            name="books.vertical.fill"
            size={24}
            color={isSelected ? primaryColor : subtitleColor}
          />
          <View style={styles.seriesItemText}>
            <ThemedText style={styles.seriesItemName}>{item.name}</ThemedText>
            <ThemedText style={[styles.seriesItemDetail, { color: subtitleColor }]}>
              {t('seriesPicker.booksOwned', { owned: item.booksOwned, total: item.totalBooks })}
            </ThemedText>
          </View>
        </View>
        {isSelected && (
          <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.picker, { backgroundColor: cardBg, borderColor }]}
        onPress={() => setIsModalOpen(true)}
      >
        <IconSymbol
          name="books.vertical.fill"
          size={20}
          color={selectedSeries ? primaryColor : subtitleColor}
        />
        <ThemedText
          style={[
            styles.pickerText,
            !selectedSeries && { color: subtitleColor },
          ]}
          numberOfLines={1}
        >
          {selectedSeries ? selectedSeries.name : t('seriesPicker.notInSeries')}
        </ThemedText>
        <IconSymbol name="chevron.down" size={16} color={subtitleColor} />
      </Pressable>

      {/* Series Order Input */}
      {selectedSeries && onSeriesOrderChange && (
        <View style={styles.orderContainer}>
          <ThemedText style={styles.orderLabel}>{t('seriesPicker.bookNumber')}</ThemedText>
          <View style={styles.orderButtons}>
            <Pressable
              style={[styles.orderButton, { borderColor }]}
              onPress={() => onSeriesOrderChange(Math.max(1, (seriesOrder || 1) - 1))}
            >
              <IconSymbol name="minus" size={16} color={primaryColor} />
            </Pressable>
            <View style={[styles.orderValue, { borderColor }]}>
              <ThemedText style={styles.orderValueText}>
                {seriesOrder || 1}
              </ThemedText>
            </View>
            <Pressable
              style={[styles.orderButton, { borderColor }]}
              onPress={() => onSeriesOrderChange((seriesOrder || 0) + 1)}
            >
              <IconSymbol name="plus" size={16} color={primaryColor} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={[styles.modal, { backgroundColor: modalBg }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderColor }]}>
            <Pressable onPress={() => setIsModalOpen(false)} style={styles.modalClose}>
              <IconSymbol name="xmark" size={24} color={primaryColor} />
            </Pressable>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {t('seriesPicker.selectSeries')}
            </ThemedText>
            <View style={styles.modalClose} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <IconSymbol name="magnifyingglass" size={20} color={placeholderColor} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('seriesPicker.searchPlaceholder')}
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

          {/* Series List */}
          <FlatList
            data={filteredSeries}
            renderItem={renderSeriesItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalList}
            ListHeaderComponent={
              <>
                {/* Not in series option */}
                <Pressable
                  style={[
                    styles.seriesItem,
                    { backgroundColor: cardBg, borderColor },
                    !selectedSeriesId && { borderColor: primaryColor, borderWidth: 2 },
                  ]}
                  onPress={() => handleSelect(null)}
                >
                  <View style={styles.seriesItemContent}>
                    <IconSymbol
                      name="book.fill"
                      size={24}
                      color={!selectedSeriesId ? primaryColor : subtitleColor}
                    />
                    <ThemedText style={styles.seriesItemName}>
                      {t('seriesPicker.notInSeries')}
                    </ThemedText>
                  </View>
                  {!selectedSeriesId && (
                    <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
                  )}
                </Pressable>

                {/* Create new series section */}
                {isCreating ? (
                  <View style={[styles.createForm, { backgroundColor: cardBg, borderColor }]}>
                    <TextInput
                      style={[styles.createInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                      value={newSeriesName}
                      onChangeText={setNewSeriesName}
                      placeholder={t('seriesPicker.seriesNamePlaceholder')}
                      placeholderTextColor={subtitleColor}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleCreateSeries}
                      editable={!isSubmitting}
                    />
                    <View style={styles.createButtons}>
                      <Pressable
                        style={[styles.createButton, styles.cancelButton, { borderColor }]}
                        onPress={handleCancelCreate}
                        disabled={isSubmitting}
                      >
                        <ThemedText style={[styles.createButtonText, { color: subtitleColor }]}>
                          {t('common.cancel')}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.createButton,
                          styles.saveButton,
                          { backgroundColor: primaryColor },
                          (!newSeriesName.trim() || isSubmitting) && styles.buttonDisabled,
                        ]}
                        onPress={handleCreateSeries}
                        disabled={!newSeriesName.trim() || isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <ThemedText style={[styles.createButtonText, { color: '#FFFFFF' }]}>
                            {t('common.save')}
                          </ThemedText>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.seriesItem, styles.createNewItem, { borderColor: primaryColor }]}
                    onPress={() => setIsCreating(true)}
                  >
                    <View style={styles.seriesItemContent}>
                      <IconSymbol name="plus.circle.fill" size={24} color={primaryColor} />
                      <ThemedText style={[styles.seriesItemName, { color: primaryColor }]}>
                        {t('seriesPicker.createNew')}
                      </ThemedText>
                    </View>
                  </Pressable>
                )}
              </>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subtitleColor }]}>
                  {t('seriesPicker.noSeriesYet')}
                </ThemedText>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
  },
  orderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderValue: {
    minWidth: 48,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  orderValueText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalClose: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
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
  modalList: {
    padding: 16,
    gap: 12,
  },
  seriesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  createNewItem: {
    borderStyle: 'dashed',
    borderWidth: 2,
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  createForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  createInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
  },
  createButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  seriesItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  seriesItemText: {
    flex: 1,
  },
  seriesItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  seriesItemDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
  },
});

