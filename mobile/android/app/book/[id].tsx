import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookStatusBadge, getAllStatuses, getStatusConfig } from '@/components/book-status-badge';
import { useBookOperations } from '@/hooks/use-books';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFamilyStore } from '@/stores/family-store';
import { uploadBookCover } from '@/lib/storage';
import type { Book, BookStatus } from '@/types/models';

const PLACEHOLDER_COVER = 'https://via.placeholder.com/200x300/E5D4C0/8B5A2B?text=No+Cover';

export default function BookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedMember } = useFamily();
  const { fetchBook, editBook, removeBook, updateBookStatus } = useBookOperations();

  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [newCoverUri, setNewCoverUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const inputBg = useThemeColor({ light: '#F5F0EA', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const subtitleColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');
  const placeholderColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');

  useEffect(() => {
    async function loadBook() {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const fetchedBook = await fetchBook(id);
        if (fetchedBook) {
          setBook(fetchedBook);
          setEditTitle(fetchedBook.title);
          setEditAuthor(fetchedBook.author);
        }
      } catch (error) {
        console.error('Failed to load book:', error);
        Alert.alert('Error', 'Failed to load book details');
      } finally {
        setIsLoading(false);
      }
    }

    loadBook();
  }, [id, fetchBook]);

  const handleStatusChange = useCallback(
    async (newStatus: BookStatus) => {
      if (!book) return;

      try {
        await updateBookStatus(book.id, newStatus);
        setBook((prev) => (prev ? { ...prev, status: newStatus } : null));
      } catch (error) {
        Alert.alert('Error', 'Failed to update status');
      }
    },
    [book, updateBookStatus]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!book) return;
    if (!editTitle.trim() || !editAuthor.trim()) {
      Alert.alert('Required', 'Title and author are required.');
      return;
    }

    setIsSaving(true);
    try {
      await editBook(book.id, {
        title: editTitle.trim(),
        author: editAuthor.trim(),
      });
      setBook((prev) =>
        prev ? { ...prev, title: editTitle.trim(), author: editAuthor.trim() } : null
      );
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [book, editTitle, editAuthor, editBook]);

  const handleDelete = useCallback(() => {
    if (!book) return;

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
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete book');
            }
          },
        },
      ]
    );
  }, [book, removeBook, router]);

  const handleCancelEdit = useCallback(() => {
    if (book) {
      setEditTitle(book.title);
      setEditAuthor(book.author);
    }
    setNewCoverUri(null);
    setIsEditing(false);
  }, [book]);

  const handlePickCover = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewCoverUri(result.assets[0].uri);
    }
  }, []);

  const handleTakeCoverPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewCoverUri(result.assets[0].uri);
    }
  }, []);

  const handleCoverOptions = useCallback(() => {
    Alert.alert(
      'Change Cover Image',
      'Choose how to update the cover',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakeCoverPhoto },
        { text: 'Choose from Library', onPress: handlePickCover },
      ]
    );
  }, [handlePickCover, handleTakeCoverPhoto]);

  const handleUploadNewCover = useCallback(async () => {
    if (!book || !newCoverUri) return;

    const family = useFamilyStore.getState().family;
    const selectedMemberId = useFamilyStore.getState().selectedMemberId;
    
    if (!family || !selectedMemberId) {
      Alert.alert('Error', 'Unable to upload cover. Please try again.');
      return;
    }

    setIsUploadingCover(true);
    try {
      const thumbnailUrl = await uploadBookCover(newCoverUri, family.id, selectedMemberId, book.id);
      await editBook(book.id, { thumbnailUrl });
      setBook((prev) => (prev ? { ...prev, thumbnailUrl } : null));
      setNewCoverUri(null);
      Alert.alert('Success', 'Cover updated successfully!');
    } catch (error) {
      console.error('Failed to upload cover:', error);
      Alert.alert('Error', 'Failed to upload cover. Please check your permissions.');
    } finally {
      setIsUploadingCover(false);
    }
  }, [book, newCoverUri, editBook]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText style={styles.loadingText}>Loading book...</ThemedText>
      </ThemedView>
    );
  }

  if (!book) {
    return (
      <ThemedView style={styles.errorContainer}>
        <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#E57373" />
        <ThemedText style={styles.errorText}>Book not found</ThemedText>
        <Pressable
          style={[styles.button, { backgroundColor: primaryColor }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.buttonText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Book Cover */}
        <View style={styles.coverSection}>
          <Pressable
            style={[styles.coverContainer, { backgroundColor: cardBg }]}
            onPress={handleCoverOptions}
          >
            <Image
              source={{ uri: newCoverUri || book.thumbnailUrl || PLACEHOLDER_COVER }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.coverOverlay}>
              <IconSymbol name="camera" size={24} color="#FFFFFF" />
            </View>
          </Pressable>
          {newCoverUri && (
            <View style={styles.coverActions}>
              <Pressable
                style={[styles.coverActionButton, styles.cancelCoverButton, { borderColor: inputBorder }]}
                onPress={() => setNewCoverUri(null)}
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.coverActionButton, { backgroundColor: primaryColor }]}
                onPress={handleUploadNewCover}
                disabled={isUploadingCover}
              >
                <ThemedText style={styles.buttonText}>
                  {isUploadingCover ? 'Uploading...' : 'Save Cover'}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        {/* Book Info */}
        <View style={[styles.infoSection, { backgroundColor: cardBg }]}>
          {isEditing ? (
            <>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Title</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
                  ]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Book title"
                  placeholderTextColor={placeholderColor}
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Author</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
                  ]}
                  value={editAuthor}
                  onChangeText={setEditAuthor}
                  placeholder="Author name"
                  placeholderTextColor={placeholderColor}
                />
              </View>
              <View style={styles.editActions}>
                <Pressable
                  style={[styles.actionButton, styles.cancelButton, { borderColor: inputBorder }]}
                  onPress={handleCancelEdit}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: primaryColor }]}
                  onPress={handleSaveEdit}
                  disabled={isSaving}
                >
                  <ThemedText style={styles.buttonText}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ThemedText type="title" style={styles.bookTitle}>
                {book.title}
              </ThemedText>
              <ThemedText style={[styles.bookAuthor, { color: subtitleColor }]}>
                by {book.author}
              </ThemedText>
              <Pressable style={styles.editTrigger} onPress={() => setIsEditing(true)}>
                <IconSymbol name="pencil" size={16} color={primaryColor} />
                <ThemedText style={{ color: primaryColor }}>Edit</ThemedText>
              </Pressable>
            </>
          )}
        </View>

        {/* Status Section */}
        <View style={[styles.statusSection, { backgroundColor: cardBg }]}>
          <ThemedText style={styles.sectionTitle}>Reading Status</ThemedText>
          <View style={styles.statusOptions}>
            {getAllStatuses().map((s) => {
              const config = getStatusConfig(s);
              const isActive = book.status === s;
              return (
                <Pressable
                  key={s}
                  style={[
                    styles.statusOption,
                    { borderColor: config.bgColor },
                    isActive && { backgroundColor: config.bgColor },
                  ]}
                  onPress={() => handleStatusChange(s)}
                >
                  <ThemedText
                    style={[
                      styles.statusLabel,
                      { color: isActive ? '#FFFFFF' : config.bgColor },
                    ]}
                  >
                    {config.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Member Info */}
        {selectedMember && (
          <View style={[styles.memberSection, { backgroundColor: cardBg }]}>
            <ThemedText style={styles.sectionTitle}>Belongs to</ThemedText>
            <View style={styles.memberInfo}>
              <View style={[styles.memberDot, { backgroundColor: selectedMember.color }]} />
              <ThemedText style={styles.memberName}>{selectedMember.name}</ThemedText>
            </View>
          </View>
        )}

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Pressable
            style={[styles.deleteButton, { borderColor: '#E57373' }]}
            onPress={handleDelete}
          >
            <IconSymbol name="trash" size={20} color="#E57373" />
            <ThemedText style={styles.deleteButtonText}>Delete Book</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  coverSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  coverContainer: {
    width: 160,
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    width: '100%',
    maxWidth: 280,
  },
  coverActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelCoverButton: {
    borderWidth: 1,
  },
  infoSection: {
    padding: 20,
    borderRadius: 16,
    gap: 8,
  },
  bookTitle: {
    fontSize: 24,
    lineHeight: 32,
  },
  bookAuthor: {
    fontSize: 16,
    marginBottom: 8,
  },
  editTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  statusSection: {
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberSection: {
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  dangerSection: {
    marginTop: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteButtonText: {
    color: '#E57373',
    fontWeight: '600',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

