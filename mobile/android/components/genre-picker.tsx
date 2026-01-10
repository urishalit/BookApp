import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { GenreBadge } from '@/components/genre-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { COMMON_GENRES, getGenreDisplay, normalizeGenre } from '@/constants/genres';

interface GenrePickerProps {
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
  compact?: boolean;
}

export function GenrePicker({ selectedGenres, onGenresChange, compact = false }: GenrePickerProps) {
  const { t } = useTranslation();
  const [customGenre, setCustomGenre] = useState('');
  
  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const inputBg = useThemeColor({ light: '#F5F0EA', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const placeholderColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  
  const handleToggleGenre = useCallback((genre: string) => {
    const normalized = normalizeGenre(genre);
    const isSelected = selectedGenres.some(g => normalizeGenre(g) === normalized);
    
    if (isSelected) {
      onGenresChange(selectedGenres.filter(g => normalizeGenre(g) !== normalized));
    } else {
      onGenresChange([...selectedGenres, genre]);
    }
  }, [selectedGenres, onGenresChange]);
  
  const handleRemoveGenre = useCallback((genre: string) => {
    const normalized = normalizeGenre(genre);
    onGenresChange(selectedGenres.filter(g => normalizeGenre(g) !== normalized));
  }, [selectedGenres, onGenresChange]);
  
  const handleAddCustom = useCallback(() => {
    const trimmed = customGenre.trim();
    if (!trimmed) return;
    
    const normalized = normalizeGenre(trimmed);
    const isAlreadySelected = selectedGenres.some(g => normalizeGenre(g) === normalized);
    
    if (!isAlreadySelected) {
      onGenresChange([...selectedGenres, trimmed]);
    }
    
    setCustomGenre('');
  }, [customGenre, selectedGenres, onGenresChange]);
  
  const isGenreSelected = (genre: string) => {
    const normalized = normalizeGenre(genre);
    return selectedGenres.some(g => normalizeGenre(g) === normalized);
  };
  
  return (
    <View style={styles.container}>
      {/* Selected Genres */}
      {selectedGenres.length > 0 && (
        <View style={styles.selectedContainer}>
          {selectedGenres.map((genre) => (
            <GenreBadge
              key={genre}
              genre={genre}
              size="medium"
              onRemove={() => handleRemoveGenre(genre)}
            />
          ))}
        </View>
      )}
      
      {/* Common Genres Quick Select */}
      {!compact && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickSelectContainer}
        >
          {COMMON_GENRES.map((genre) => {
            const selected = isGenreSelected(genre);
            const { name, color } = getGenreDisplay(genre, t);
            
            return (
              <Pressable
                key={genre}
                style={[
                  styles.quickSelectButton,
                  { 
                    backgroundColor: selected ? color : cardBg,
                    borderColor: selected ? color : inputBorder,
                  },
                ]}
                onPress={() => handleToggleGenre(genre)}
              >
                <ThemedText
                  style={[
                    styles.quickSelectText,
                    { color: selected ? '#FFFFFF' : textColor },
                  ]}
                >
                  {name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      
      {/* Custom Genre Input */}
      <View style={styles.customInputContainer}>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: inputBg, borderColor: inputBorder },
          ]}
        >
          <TextInput
            style={[styles.input, { color: textColor }]}
            value={customGenre}
            onChangeText={setCustomGenre}
            placeholder={t('genrePicker.customPlaceholder')}
            placeholderTextColor={placeholderColor}
            returnKeyType="done"
            onSubmitEditing={handleAddCustom}
          />
          {customGenre.trim() && (
            <Pressable
              style={[styles.addButton, { backgroundColor: primaryColor }]}
              onPress={handleAddCustom}
            >
              <IconSymbol name="plus" size={16} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  selectedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSelectContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  quickSelectButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickSelectText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customInputContainer: {
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

