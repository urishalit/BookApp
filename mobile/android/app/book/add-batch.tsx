import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useBatchAddStore } from '@/stores/batch-add-store';
import { getActionOnCameraCancel } from '@/lib/batch-capture-utils';
import { useThemeColor } from '@/hooks/use-theme-color';

const CAMERA_OPTIONS = {
  allowsEditing: true,
  aspect: [2, 3] as const,
  quality: 0.8,
};

export default function AddBatchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, setPermission] = useState<boolean | null>(null);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const setStorePhotoUris = useBatchAddStore((s) => s.setPhotoUris);
  const hasLaunchedRef = useRef(false);

  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const inputBg = useThemeColor({ light: '#F5F0EA', dark: '#1A2129' }, 'background');

  const requestPermission = useCallback(async () => {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    setPermission(result.granted);
    if (!result.granted) {
      Alert.alert(t('addBook.permissionRequired'), t('addBook.cameraPermission'));
    }
    return result.granted;
  }, [t]);

  const showContinueStopChoice = useCallback(
    (currentUris: string[]) => {
      Alert.alert(
        t('addBatch.photoTakenSoFar', { count: currentUris.length }),
        undefined,
        [
          {
            text: t('addBatch.continue'),
            onPress: () => launchCamera(currentUris),
          },
          {
            text: t('addBatch.stop'),
            onPress: () => {
              setStorePhotoUris(currentUris);
              router.replace('/book/add-batch-wizard');
            },
          },
        ]
      );
    },
    [t, setStorePhotoUris, router]
  );

  const launchCamera = useCallback(
    async (currentUris: string[]) => {
      if (isCapturing) return;
      setIsCapturing(true);

      try {
        const result = await ImagePicker.launchCameraAsync(CAMERA_OPTIONS);

        if (!result.canceled && result.assets[0]) {
          const updatedUris = [...currentUris, result.assets[0].uri];
          setPhotoUris(updatedUris);
          showContinueStopChoice(updatedUris);
        } else {
          const action = getActionOnCameraCancel(currentUris);
          if (action === 'goBack') {
            router.back();
          } else {
            showContinueStopChoice(currentUris);
          }
        }
      } catch (err) {
        console.error('Capture error:', err);
        Alert.alert(t('common.error'), t('errors.generic'));
        if (currentUris.length > 0) {
          showContinueStopChoice(currentUris);
        } else {
          router.back();
        }
      } finally {
        setIsCapturing(false);
      }
    },
    [isCapturing, showContinueStopChoice, router, t]
  );

  useEffect(() => {
    if (hasLaunchedRef.current) return;

    const init = async () => {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      setPermission(status === 'granted');

      if (status === 'granted') {
        hasLaunchedRef.current = true;
        launchCamera([]);
      }
    };

    init();
  }, [launchCamera]);

  const handleGrantPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      hasLaunchedRef.current = true;
      launchCamera([]);
    }
  }, [requestPermission, launchCamera]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (permission === null) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText style={styles.message}>{t('common.loading')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (permission === false) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText style={styles.message}>{t('addBatch.permissionMessage')}</ThemedText>
          <Pressable
            style={[styles.permissionButton, { backgroundColor: primaryColor }]}
            onPress={handleGrantPermission}
          >
            <ThemedText style={styles.permissionButtonText}>
              {t('addBatch.grantPermission')}
            </ThemedText>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <ThemedText style={[styles.cancelButtonText, { color: primaryColor }]}>
              {t('common.cancel')}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {isCapturing ? (
          <ThemedText style={styles.message}>{t('common.loading')}</ThemedText>
        ) : (
          <>
            <ThemedText style={styles.hint}>{t('addBatch.captureHint')}</ThemedText>
            {photoUris.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.thumbnails}
                  contentContainerStyle={styles.thumbnailsContent}
                >
                  {photoUris.map((uri, i) => (
                    <Image
                      key={i}
                      source={{ uri }}
                      style={[styles.thumbnail, { backgroundColor: cardBg }]}
                      contentFit="cover"
                    />
                  ))}
                </ScrollView>
                <ThemedText style={styles.count}>
                  {t('addBatch.photosCaptured', { count: photoUris.length })}
                </ThemedText>
                <Pressable style={styles.cancelButton} onPress={handleCancel}>
                  <ThemedText style={[styles.cancelButtonText, { color: primaryColor }]}>
                    {t('common.cancel')}
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <ThemedText style={styles.message}>{t('common.loading')}</ThemedText>
            )}
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  thumbnails: {
    maxHeight: 120,
  },
  thumbnailsContent: {
    gap: 8,
    paddingVertical: 8,
  },
  thumbnail: {
    width: 56,
    height: 84,
    borderRadius: 8,
  },
  count: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
