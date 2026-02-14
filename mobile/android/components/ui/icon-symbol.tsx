// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.down': 'keyboard-arrow-down',
  'book.fill': 'menu-book',
  'book': 'book',
  'book.closed': 'book',
  'book.closed.fill': 'auto-stories',
  'book.pages': 'description',
  'books.vertical.fill': 'library-books',
  'person.3.fill': 'groups',
  'person.fill.questionmark': 'person-search',
  'person.crop.circle.badge.exclamationmark': 'person-off',
  'magnifyingglass': 'search',
  'plus': 'add',
  'plus.circle.fill': 'add-circle',
  'minus': 'remove',
  'pencil': 'edit',
  'trash': 'delete',
  'exclamationmark.triangle': 'warning',
  'exclamationmark.triangle.fill': 'warning',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  'checkmark': 'check',
  'checkmark.circle.fill': 'check-circle',
  'checkmark.seal.fill': 'verified',
  'arrow.left': 'arrow-back',
  'photo': 'photo-library',
  'camera': 'photo-camera',
  'camera.fill': 'camera-alt',
  'photo.on.rectangle.angled': 'collections',
  'calendar': 'calendar-today',
  'gearshape.fill': 'settings',
  'rectangle.portrait.and.arrow.right': 'logout',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
