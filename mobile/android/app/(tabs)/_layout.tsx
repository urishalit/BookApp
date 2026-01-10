import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const tintColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const tabBarBg = useThemeColor({ light: '#FFFFFF', dark: '#1A2129' }, 'background');
  const inactiveColor = useThemeColor({ light: '#999999', dark: '#666666' }, 'text');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tintColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: colorScheme === 'dark' ? '#2D3748' : '#E5D4C0',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="family"
        options={{
          title: t('tabs.family'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.3.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.books'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          title: t('tabs.series'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="books.vertical.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
    </Tabs>
  );
}
