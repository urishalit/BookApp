import { Stack } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SeriesLayout() {
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
          title: 'Series Details',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Create Series',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

