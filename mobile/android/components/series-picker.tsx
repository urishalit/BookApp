import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, FlatList } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSeries, SeriesWithProgress } from '@/hooks/use-series';

interface SeriesPickerProps {
  selectedSeriesId?: string;
  onSeriesSelect: (seriesId: string | undefined, seriesName?: string) => void;
  seriesOrder?: number;
  onSeriesOrderChange?: (order: number | undefined) => void;
}

export function SeriesPicker({
  selectedSeriesId,
  onSeriesSelect,
  seriesOrder,
  onSeriesOrderChange,
}: SeriesPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { series } = useSeries();

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const subtitleColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');
  const modalBg = useThemeColor({ light: '#F5F5F5', dark: '#151718' }, 'background');

  const selectedSeries = series.find((s) => s.id === selectedSeriesId);

  const handleSelect = (item: SeriesWithProgress | null) => {
    if (item) {
      onSeriesSelect(item.id, item.name);
      // Suggest next order number
      if (onSeriesOrderChange) {
        const nextOrder = item.booksOwned + 1;
        onSeriesOrderChange(nextOrder);
      }
    } else {
      onSeriesSelect(undefined, undefined);
      if (onSeriesOrderChange) {
        onSeriesOrderChange(undefined);
      }
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
              {item.booksOwned} of {item.totalBooks} books
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
          {selectedSeries ? selectedSeries.name : 'Not part of a series'}
        </ThemedText>
        <IconSymbol name="chevron.down" size={16} color={subtitleColor} />
      </Pressable>

      {/* Series Order Input */}
      {selectedSeries && onSeriesOrderChange && (
        <View style={styles.orderContainer}>
          <ThemedText style={styles.orderLabel}>Book # in series:</ThemedText>
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
              Select Series
            </ThemedText>
            <View style={styles.modalClose} />
          </View>

          {/* Series List */}
          <FlatList
            data={series}
            renderItem={renderSeriesItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalList}
            ListHeaderComponent={
              <Pressable
                style={[
                  styles.seriesItem,
                  styles.noSeriesItem,
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
                    Not part of a series
                  </ThemedText>
                </View>
                {!selectedSeriesId && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={primaryColor} />
                )}
              </Pressable>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subtitleColor }]}>
                  No series created yet. Create a series from the Series tab first.
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
  noSeriesItem: {
    marginBottom: 16,
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

