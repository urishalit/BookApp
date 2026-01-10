import React, { useState, useCallback } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SeriesPicker } from '@/components/series-picker';
import { getAllStatuses, getStatusConfig } from '@/components/book-status-badge';
import { useBookOperations } from '@/hooks/use-books';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFamilyStore } from '@/stores/family-store';
import { uploadBookCover } from '@/lib/storage';
import type { BookStatus } from '@/types/models';

export default function AddBookScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedMember, selectedMemberId } = useFamily();
  const { addBook } = useBookOperations();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<BookStatus>('to-read');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [seriesId, setSeriesId] = useState<string | undefined>();
  const [seriesOrder, setSeriesOrder] = useState<number | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const inputBg = useThemeColor({ light: '#F5F0EA', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const placeholderColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('addBook.permissionRequired'), t('addBook.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  }, [t]);

  const handleImageOptions = useCallback(() => {
    Alert.alert(
      t('addBook.addCoverImage'),
      t('addBook.chooseCoverMethod'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('member.takePhoto'), onPress: handleTakePhoto },
        { text: t('member.chooseFromLibrary'), onPress: handlePickImage },
      ]
    );
  }, [handlePickImage, handleTakePhoto, t]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert(t('common.required'), t('addBook.titleRequired'));
      return;
    }

    if (!author.trim()) {
      Alert.alert(t('common.required'), t('addBook.authorRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      let thumbnailUrl: string | undefined;

      // Upload cover image if provided
      if (coverUri && selectedMemberId) {
        try {
          const family = useFamilyStore.getState().family;
          if (family) {
            thumbnailUrl = await uploadBookCover(coverUri, family.id, selectedMemberId);
          }
        } catch (err) {
          console.error('Failed to upload cover:', err);
          // Continue without cover
        }
      }

      await addBook({
        title: title.trim(),
        author: author.trim(),
        status,
        thumbnailUrl,
        seriesId,
        seriesOrder,
      });

      router.back();
    } catch (error) {
      console.error('Add book error:', error);
      const message = error instanceof Error ? error.message : 'Failed to add book';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [title, author, status, coverUri, selectedMemberId, seriesId, seriesOrder, addBook, router]);

  if (!selectedMember) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            {t('addBook.selectMemberFirst')}
          </ThemedText>
          <Pressable
            style={[styles.button, { backgroundColor: primaryColor }]}
            onPress={() => router.push('/(tabs)/family')}
          >
            <ThemedText style={styles.buttonText}>{t('common.goToFamily')}</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

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
          {/* Cover Image */}
          <Pressable
            style={[styles.coverContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}
            onPress={handleImageOptions}
          >
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} contentFit="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <IconSymbol name="photo" size={48} color={placeholderColor} />
                <ThemedText style={[styles.coverPlaceholderText, { color: placeholderColor }]}>
                  {t('addBook.addCover')}
                </ThemedText>
              </View>
            )}
          </Pressable>

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
              returnKeyType="done"
            />
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
              onSeriesSelect={(id) => setSeriesId(id)}
              seriesOrder={seriesOrder}
              onSeriesOrderChange={setSeriesOrder}
            />
          </View>

          {/* Adding for member info */}
          <View style={[styles.memberNote, { backgroundColor: inputBg }]}>
            <ThemedText style={styles.memberNoteText}>
              {t('addBook.addingFor')} <ThemedText style={{ fontWeight: '600' }}>{selectedMember.name}</ThemedText>
            </ThemedText>
          </View>

          {/* Submit Button */}
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
  coverContainer: {
    width: 140,
    height: 210,
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coverPlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
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
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
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
