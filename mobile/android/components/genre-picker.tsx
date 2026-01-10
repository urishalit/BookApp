import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { GenreBadge } from '@/components/genre-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useExistingGenres } from '@/hooks/use-books';
import { COMMON_GENRES, getGenreDisplay, normalizeGenre } from '@/constants/genres';

interface GenrePickerProps {
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
  compact?: boolean;
}

export function GenrePicker({ selectedGenres, onGenresChange }: GenrePickerProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const pendingSelectionRef = useRef<string | null>(null);
  
  // Get existing genres from family books for autocomplete
  const existingGenres = useExistingGenres();
  
  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const inputBg = useThemeColor({ light: '#F5F0EA', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const placeholderColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  
  const isGenreSelected = useCallback((genre: string) => {
    const normalized = normalizeGenre(genre);
    return selectedGenres.some(g => normalizeGenre(g) === normalized);
  }, [selectedGenres]);
  
  const handleRemoveGenre = useCallback((genre: string) => {
    const normalized = normalizeGenre(genre);
    onGenresChange(selectedGenres.filter(g => normalizeGenre(g) !== normalized));
  }, [selectedGenres, onGenresChange]);
  
  const handleAddGenre = useCallback((genre: string) => {
    const trimmed = genre.trim();
    if (!trimmed) return;
    
    if (!isGenreSelected(trimmed)) {
      const newGenres = [...selectedGenres, trimmed];
      onGenresChange(newGenres);
    }
    
    setInputValue('');
  }, [selectedGenres, onGenresChange, isGenreSelected]);
  
  const handleSubmit = useCallback(() => {
    handleAddGenre(inputValue);
  }, [inputValue, handleAddGenre]);

  const handleFocus = useCallback(() => {
    setIsDropdownVisible(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Check if there's a pending selection to process
    setTimeout(() => {
      if (pendingSelectionRef.current) {
        const genre = pendingSelectionRef.current;
        pendingSelectionRef.current = null;
        handleAddGenre(genre);
      }
      setIsDropdownVisible(false);
    }, 100);
  }, [handleAddGenre]);

  // Store the genre to be selected when item is touched
  const handleItemTouchStart = useCallback((genre: string) => {
    pendingSelectionRef.current = genre;
  }, []);
  
  // Compute dropdown suggestions based on input
  const suggestions = useMemo(() => {
    const input = inputValue.trim().toLowerCase();
    
    // Combine common genres and existing genres
    const allGenres = [...new Set([...COMMON_GENRES, ...existingGenres])];
    
    // Filter to matching ones that aren't already selected
    const filtered = allGenres.filter(genre => {
      const normalized = normalizeGenre(genre);
      const matchesInput = input.length === 0 || normalized.includes(input);
      const notSelected = !isGenreSelected(genre);
      return matchesInput && notSelected;
    });
    
    // Sort: prioritize common genres, then alphabetically
    return filtered.sort((a, b) => {
      const aIsCommon = COMMON_GENRES.includes(a);
      const bIsCommon = COMMON_GENRES.includes(b);
      if (aIsCommon && !bIsCommon) return -1;
      if (!aIsCommon && bIsCommon) return 1;
      return a.localeCompare(b);
    }).slice(0, 8); // Limit to 8 suggestions
  }, [inputValue, existingGenres, isGenreSelected]);

  // Check if input is a new custom genre (not in suggestions)
  const isNewCustomGenre = useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return false;
    const normalized = normalizeGenre(trimmed);
    return !suggestions.some(s => normalizeGenre(s) === normalized) && !isGenreSelected(trimmed);
  }, [inputValue, suggestions, isGenreSelected]);
  
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
      
      {/* Dropdown Input */}
      <View style={styles.dropdownContainer}>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: inputBg, borderColor: inputBorder },
            isDropdownVisible && (suggestions.length > 0 || isNewCustomGenre) && styles.inputWrapperFocused,
          ]}
        >
          <IconSymbol name="magnifyingglass" size={18} color={placeholderColor} />
          <TextInput
            style={[styles.input, { color: textColor }]}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={t('genrePicker.searchPlaceholder')}
            placeholderTextColor={placeholderColor}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {inputValue.length > 0 && (
            <Pressable onPress={() => setInputValue('')} hitSlop={8}>
              <IconSymbol name="xmark.circle.fill" size={18} color={placeholderColor} />
            </Pressable>
          )}
        </View>
        
        {/* Dropdown Suggestions */}
        {isDropdownVisible && (suggestions.length > 0 || isNewCustomGenre) && (
          <ScrollView 
            style={[styles.dropdown, { backgroundColor: cardBg, borderColor: inputBorder }]}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            {/* Add custom genre option */}
            {isNewCustomGenre && (
              <Pressable
                style={[styles.dropdownItem, styles.customItem]}
                onTouchStart={() => handleItemTouchStart(inputValue.trim())}
              >
                <View style={[styles.addIcon, { backgroundColor: primaryColor }]}>
                  <IconSymbol name="plus" size={12} color="#FFFFFF" />
                </View>
                <ThemedText style={styles.dropdownText}>
                  {t('genrePicker.addCustom', { genre: inputValue.trim() })}
                </ThemedText>
              </Pressable>
            )}
            
            {/* Existing genre suggestions */}
            {suggestions.map((genre) => {
              const { name, color } = getGenreDisplay(genre, t);
              return (
                <Pressable
                  key={genre}
                  style={styles.dropdownItem}
                  onTouchStart={() => handleItemTouchStart(genre)}
                >
                  <View style={[styles.genreDot, { backgroundColor: color }]} />
                  <ThemedText style={styles.dropdownText}>{name}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
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
  dropdownContainer: {
    zIndex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  inputWrapperFocused: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  dropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    maxHeight: 280,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  customItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5D4C0',
  },
  addIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dropdownText: {
    fontSize: 15,
  },
});
