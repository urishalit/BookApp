import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SeriesLayout() {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor },
        headerTintColor: textColor,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: t('seriesDetail.title'),
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: t('createSeries.title'),
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

