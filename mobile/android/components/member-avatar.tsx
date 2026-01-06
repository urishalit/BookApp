import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';

interface MemberAvatarProps {
  name: string;
  color: string;
  avatarUrl?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  onPress?: () => void;
  showBadge?: boolean;
  badgeColor?: string;
}

const SIZE_MAP = {
  small: 40,
  medium: 56,
  large: 80,
  xlarge: 120,
};

const FONT_SIZE_MAP = {
  small: 16,
  medium: 22,
  large: 32,
  xlarge: 48,
};

export function MemberAvatar({
  name,
  color,
  avatarUrl,
  size = 'medium',
  onPress,
  showBadge,
  badgeColor,
}: MemberAvatarProps) {
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];

  // Get initials (up to 2 characters)
  const initials = name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const content = (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: color,
        },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      )}
      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              width: dimension * 0.25,
              height: dimension * 0.25,
              borderRadius: (dimension * 0.25) / 2,
              backgroundColor: badgeColor ?? '#4CAF50',
              right: 0,
              bottom: 0,
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pressable: {
    // Pressable wrapper
  },
});

