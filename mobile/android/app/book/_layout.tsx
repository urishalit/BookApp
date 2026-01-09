import { Stack } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function BookLayout() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor },
        headerTintColor: primaryColor,
        headerTitleStyle: { color: textColor },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Book Details',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Book',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="add-from-search"
        options={{
          title: 'Add Book',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

