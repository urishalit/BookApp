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
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MemberAvatar } from '@/components/member-avatar';
import { ColorPicker } from '@/components/color-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useMemberOperations, useFamily } from '@/hooks/use-family';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getSuggestedColor } from '@/constants/member-colors';
import * as ImagePicker from 'expo-image-picker';

export default function CreateMemberScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { members } = useFamily();
  const { addMember } = useMemberOperations();

  const existingColors = members.map((m) => m.color);
  const suggestedColor = getSuggestedColor(existingColors);

  const [name, setName] = useState('');
  const [color, setColor] = useState(suggestedColor);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const inputBg = useThemeColor({ light: '#F5F5F5', dark: '#1A2129' }, 'background');
  const inputBorder = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'border');
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor(
    { light: '#999999', dark: '#666666' },
    'text'
  );

  const handlePickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('member.permissionRequired'),
          t('member.photoLibraryPermission')
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(t('common.error'), t('member.failedToPickImage'));
    }
  }, [t]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('member.permissionRequired'),
          t('member.cameraPermission')
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(t('common.error'), t('member.failedToTakePhoto'));
    }
  }, [t]);

  const handleAvatarPress = useCallback(() => {
    Alert.alert(t('member.chooseAvatar'), undefined, [
      { text: t('member.takePhoto'), onPress: handleTakePhoto },
      { text: t('member.chooseFromLibrary'), onPress: handlePickImage },
      ...(avatarUri ? [{ text: t('member.removeAvatar'), onPress: () => setAvatarUri(null), style: 'destructive' as const }] : []),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  }, [handleTakePhoto, handlePickImage, avatarUri, t]);

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('member.nameRequired'), t('member.nameRequiredMessage'));
      return;
    }

    setIsSubmitting(true);
    try {
      await addMember({
        name: trimmedName,
        color,
        avatarUri: avatarUri ?? undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to create member:', error);
      Alert.alert(t('common.error'), t('member.failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  }, [name, color, avatarUri, addMember, router, t]);

  const canSubmit = name.trim().length > 0 && !isSubmitting;

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
            {t('member.addMember')}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handleAvatarPress}>
              <MemberAvatar
                name={name || '?'}
                color={color}
                avatarUrl={avatarUri ?? undefined}
                size="xlarge"
              />
              <View style={[styles.cameraButton, { backgroundColor: primaryColor }]}>
                <IconSymbol name="camera.fill" size={16} color="#FFFFFF" />
              </View>
            </Pressable>
            <ThemedText style={styles.avatarHint}>{t('member.tapToAddPhoto')}</ThemedText>
          </View>

          {/* Name Input */}
          <View style={styles.inputSection}>
            <ThemedText type="subtitle" style={styles.label}>
              {t('member.name')}
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
              placeholder={t('member.namePlaceholder')}
              placeholderTextColor={placeholderColor}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
            />
          </View>

          {/* Color Picker */}
          <View style={styles.inputSection}>
            <ThemedText type="subtitle" style={styles.label}>
              {t('member.color')}
            </ThemedText>
            <ColorPicker selectedColor={color} onColorSelect={setColor} />
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
                <ThemedText style={styles.submitText}>{t('member.addMember')}</ThemedText>
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
  avatarSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    marginTop: 12,
    opacity: 0.6,
    fontSize: 14,
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
});

