import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getRouteForAddMode } from '@/lib/add-book-utils';

interface AddBookDropdownProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (route: string) => void;
  buttonLayout?: { x: number; y: number; width: number; height: number };
}

const MENU_WIDTH = 56;
const MENU_ITEM_SIZE = 40;

export function AddBookDropdown({
  visible,
  onDismiss,
  onSelect,
  buttonLayout,
}: AddBookDropdownProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const primaryColor = useThemeColor({ light: '#8B5A2B', dark: '#D4A574' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2730' }, 'background');
  const borderColor = useThemeColor({ light: '#E5D4C0', dark: '#2D3748' }, 'text');

  const handleSelect = useCallback(
    (mode: 'single' | 'batch') => {
      onSelect(getRouteForAddMode(mode));
      onDismiss();
    },
    [onSelect, onDismiss]
  );

  // Position menu centered under the + button
  const menuStyle = buttonLayout
    ? {
        top: buttonLayout.y + buttonLayout.height + 8,
        left: Math.max(
          16,
          Math.min(
            buttonLayout.x + buttonLayout.width / 2 - MENU_WIDTH / 2,
            width - MENU_WIDTH - 16
          )
        ),
      }
    : {
        top: insets.top + 100,
        left: width - MENU_WIDTH - 36,
      };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable
          style={[styles.menu, { backgroundColor: cardBg, borderColor }, menuStyle]}
          onPress={(e) => e.stopPropagation()}
        >
          <Pressable
            style={styles.menuItem}
            onPress={() => handleSelect('single')}
            accessibilityLabel="Add single book"
          >
            <IconSymbol name="book.fill" size={28} color={primaryColor} />
          </Pressable>
          <View style={[styles.menuDivider, { backgroundColor: borderColor }]} />
          <Pressable
            style={styles.menuItem}
            onPress={() => handleSelect('batch')}
            accessibilityLabel="Batch add with camera"
          >
            <IconSymbol name="photo.on.rectangle.angled" size={28} color={primaryColor} />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    width: MENU_ITEM_SIZE,
    height: MENU_ITEM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDivider: {
    width: '100%',
    height: 1,
    marginVertical: 4,
  },
});
