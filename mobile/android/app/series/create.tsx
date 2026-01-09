import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSeriesOperations } from '@/hooks/use-series';
import { useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function CreateSeriesScreen() {
  const router = useRouter();
  const { selectedMember } = useFamily();
  const { addSeries } = useSeriesOperations();

  const [name, setName] = useState('');
  const [totalBooks, setTotalBooks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const inputBg = useThemeColor({ light: '#F5F5F5', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'border');
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor(
    { light: '#999999', dark: '#666666' },
    'text'
  );
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter a name for the series.');
      return;
    }

    const bookCount = parseInt(totalBooks, 10);
    if (isNaN(bookCount) || bookCount < 1) {
      Alert.alert('Invalid Count', 'Please enter a valid number of books (at least 1).');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSeries({
        name: trimmedName,
        totalBooks: bookCount,
      });
      router.back();
    } catch (error) {
      console.error('Failed to create series:', error);
      Alert.alert('Error', 'Failed to create series. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, totalBooks, addSeries, router]);

  const canSubmit = name.trim().length > 0 && parseInt(totalBooks, 10) >= 1 && !isSubmitting;

  if (!selectedMember) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <IconSymbol name="person.fill.questionmark" size={64} color={primaryColor} />
          <ThemedText style={styles.emptyText}>
            Please select a family member first.
          </ThemedText>
          <Pressable
            style={[styles.button, { backgroundColor: primaryColor }]}
            onPress={() => router.push('/(tabs)/family')}
          >
            <ThemedText style={styles.buttonText}>Go to Family</ThemedText>
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
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="xmark" size={24} color={textColor} />
          </Pressable>
          <ThemedText type="title" style={styles.headerTitle}>
            New Series
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Series Icon */}
          <View style={[styles.iconSection, { backgroundColor: cardBg }]}>
            <IconSymbol name="books.vertical.fill" size={64} color={primaryColor} />
          </View>

          {/* Name Input */}
          <View style={styles.inputSection}>
            <ThemedText type="subtitle" style={styles.label}>
              Series Name *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textColor,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Harry Potter, Percy Jackson..."
              placeholderTextColor={placeholderColor}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={100}
            />
          </View>

          {/* Total Books Input */}
          <View style={styles.inputSection}>
            <ThemedText type="subtitle" style={styles.label}>
              Total Books in Series *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textColor,
                },
              ]}
              value={totalBooks}
              onChangeText={setTotalBooks}
              placeholder="e.g., 7"
              placeholderTextColor={placeholderColor}
              keyboardType="number-pad"
              maxLength={3}
            />
            <ThemedText style={[styles.hint, { color: placeholderColor }]}>
              You can update this later if the series is ongoing.
            </ThemedText>
          </View>

          {/* Member Note */}
          <View style={[styles.memberNote, { backgroundColor: inputBg }]}>
            <ThemedText style={styles.memberNoteText}>
              Creating series for:{' '}
              <ThemedText style={{ fontWeight: '600' }}>{selectedMember.name}</ThemedText>
            </ThemedText>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: canSubmit ? primaryColor : '#CCCCCC' },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol name="checkmark" size={20} color="#FFFFFF" />
                <ThemedText style={styles.submitText}>Create Series</ThemedText>
              </>
            )}
          </Pressable>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  iconSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginVertical: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    height: 52,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  hint: {
    fontSize: 13,
    marginTop: 8,
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
  footer: {
    padding: 20,
    paddingBottom: 36,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 18,
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
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

