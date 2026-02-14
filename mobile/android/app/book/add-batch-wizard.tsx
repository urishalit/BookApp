import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MemberPicker } from '@/components/member-picker';
import { SeriesPicker } from '@/components/series-picker';
import { GenrePicker } from '@/components/genre-picker';
import { getAllStatuses, getStatusConfig } from '@/components/book-status-badge';
import { useBookOperations } from '@/hooks/use-books';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFamilyStore } from '@/stores/family-store';
import { useBatchAddStore } from '@/stores/batch-add-store';
import {
  getCurrentPhoto,
  hasNextPhoto,
  getNextIndex,
} from '@/lib/batch-wizard-utils';
import { uploadBookCover } from '@/lib/storage';
import type { BookStatus } from '@/types/models';

export default function AddBatchWizardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedMember, selectedMemberId } = useFamily();
  const { addBook } = useBookOperations();
  const photoUris = useBatchAddStore((s) => s.photoUris);
  const setPhotoUris = useBatchAddStore((s) => s.setPhotoUris);
  const suggestionsByIndex = useBatchAddStore((s) => s.suggestionsByIndex);
  const reset = useBatchAddStore((s) => s.reset);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<BookStatus>('to-read');
  const [genres, setGenres] = useState<string[]>([]);
  const [seriesId, setSeriesId] = useState<string | undefined>();
  const [seriesOrder, setSeriesOrder] = useState<number | undefined>();
  const [yearInput, setYearInput] = useState('');
  const [memberId, setMemberId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const inputBg = useThemeColor({ light: '#F5F0EA', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const placeholderColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');

  const coverUri = getCurrentPhoto(photoUris, currentIndex);

  const isFinishingRef = useRef(false);

  const finishWizard = useCallback(() => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    reset();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [reset, router]);

  useEffect(() => {
    if (photoUris.length === 0) {
      finishWizard();
    }
  }, [photoUris.length, finishWizard]);

  const suggestion = suggestionsByIndex[currentIndex];
  useEffect(() => {
    if (
      suggestion &&
      !title.trim() &&
      !author.trim()
    ) {
      if (suggestion.title) setTitle(suggestion.title);
      if (suggestion.author) setAuthor(suggestion.author);
    }
  }, [currentIndex, suggestion, title, author]);

  const advanceToNext = useCallback(() => {
    setTitle('');
    setAuthor('');
    setStatus('to-read');
    setGenres([]);
    setSeriesId(undefined);
    setSeriesOrder(undefined);
    setYearInput('');
    if (hasNextPhoto(photoUris, currentIndex)) {
      setCurrentIndex(getNextIndex(currentIndex));
    } else {
      finishWizard();
    }
  }, [photoUris, currentIndex, finishWizard]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert(t('common.required'), t('addBook.titleRequired'));
      return;
    }

    if (!author.trim()) {
      Alert.alert(t('common.required'), t('addBook.authorRequired'));
      return;
    }

    const effectiveMemberId = memberId ?? selectedMemberId;
    setIsSubmitting(true);

    try {
      let thumbnailUrl: string | undefined;

      if (coverUri && effectiveMemberId) {
        try {
          const family = useFamilyStore.getState().family;
          if (family) {
            thumbnailUrl = await uploadBookCover(coverUri, family.id, effectiveMemberId);
          }
        } catch (err) {
          console.error('Failed to upload cover:', err);
        }
      }

      const year = yearInput.trim()
        ? (() => {
            const n = parseInt(yearInput.trim(), 10);
            return !isNaN(n) && n >= 1 && n <= 9999 ? n : undefined;
          })()
        : undefined;

      await addBook({
        title: title.trim(),
        author: author.trim(),
        status,
        thumbnailUrl,
        genres: genres.length > 0 ? genres : undefined,
        seriesId,
        seriesOrder,
        year,
        memberId: effectiveMemberId,
      });

      setMemberId(effectiveMemberId);
      advanceToNext();
    } catch (error) {
      console.error('Add book error:', error);
      const message = error instanceof Error ? error.message : t('errors.generic');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    title,
    author,
    status,
    coverUri,
    yearInput,
    memberId,
    selectedMemberId,
    seriesId,
    seriesOrder,
    genres,
    addBook,
    advanceToNext,
    t,
  ]);

  const handleSkip = useCallback(() => {
    const newUris = photoUris.filter((_, i) => i !== currentIndex);
    setPhotoUris(newUris);
    setTitle('');
    setAuthor('');
    setStatus('to-read');
    setGenres([]);
    setSeriesId(undefined);
    setSeriesOrder(undefined);
    setYearInput('');
    if (newUris.length > 0 && currentIndex >= newUris.length) {
      setCurrentIndex(newUris.length - 1);
    }
  }, [photoUris, currentIndex, setPhotoUris]);

  if (!selectedMember) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>{t('addBook.selectMemberFirst')}</ThemedText>
          <Pressable
            style={[styles.button, { backgroundColor: primaryColor }]}
            onPress={() => router.push('/family-management')}
          >
            <ThemedText style={styles.buttonText}>{t('family.addFirstMember')}</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (photoUris.length === 0 || coverUri === undefined) {
    return null;
  }

  const total = photoUris.length;
  const current = currentIndex + 1;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={styles.header}>
            {t('addBatch.bookXOfY', { current, total })}
          </ThemedText>

          {/* Cover Image (pre-filled, display only) */}
          <View style={[styles.coverContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            <Image source={{ uri: coverUri }} style={styles.coverImage} contentFit="cover" />
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('addBook.bookTitle')}</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder={t('addBook.titlePlaceholder')}
              placeholderTextColor={placeholderColor}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Author Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('addBook.author')}</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
              ]}
              value={author}
              onChangeText={setAuthor}
              placeholder={t('addBook.authorPlaceholder')}
              placeholderTextColor={placeholderColor}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Year Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('addBook.year')}</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
              ]}
              value={yearInput}
              onChangeText={setYearInput}
              placeholder={t('addBook.yearPlaceholder')}
              placeholderTextColor={placeholderColor}
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>

          {/* Genre Picker */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('genrePicker.title')}</ThemedText>
            <GenrePicker selectedGenres={genres} onGenresChange={setGenres} />
          </View>

          {/* Status Selector */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('addBook.readingStatus')}</ThemedText>
            <View style={[styles.statusContainer, { backgroundColor: cardBg }]}>
              {getAllStatuses().map((s) => {
                const config = getStatusConfig(s);
                const isActive = status === s;
                return (
                  <Pressable
                    key={s}
                    style={[
                      styles.statusOption,
                      isActive && { backgroundColor: config.bgColor },
                    ]}
                    onPress={() => setStatus(s)}
                  >
                    <ThemedText
                      style={[
                        styles.statusLabel,
                        { color: isActive ? '#FFFFFF' : textColor },
                      ]}
                    >
                      {t(config.label)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Series Picker */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('addBook.seriesOptional')}</ThemedText>
            <SeriesPicker
              selectedSeriesId={seriesId}
              onSeriesSelect={(id, order) => {
                setSeriesId(id);
                if (order !== undefined) setSeriesOrder(order);
              }}
              seriesOrder={seriesOrder}
              onSeriesOrderChange={setSeriesOrder}
            />
          </View>

          <MemberPicker
            value={memberId ?? selectedMemberId}
            onChange={(m) => setMemberId(m.id)}
            renderTrigger={({ onPress, selectedMember }) => (
              <Pressable onPress={onPress} style={[styles.memberNote, { backgroundColor: inputBg }]}>
                <ThemedText style={styles.memberNoteText}>
                  {t('addBook.addingFor')}{' '}
                  <ThemedText style={{ fontWeight: '600' }}>{selectedMember?.name ?? ''}</ThemedText>
                </ThemedText>
              </Pressable>
            )}
          />

          <View style={styles.actions}>
            <Pressable
              style={[styles.skipButton, { borderColor: primaryColor }]}
              onPress={handleSkip}
              disabled={isSubmitting}
            >
              <ThemedText style={[styles.skipButtonText, { color: primaryColor }]}>
                {t('addBatch.skip')}
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: primaryColor },
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <ThemedText style={styles.submitButtonText}>
                {isSubmitting ? t('addBook.adding') : t('addBook.addBook')}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  coverContainer: {
    width: 140,
    height: 210,
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberNote: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  memberNoteText: {
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
