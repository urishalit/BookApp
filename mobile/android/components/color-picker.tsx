import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MEMBER_COLORS } from '@/constants/member-colors';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export function ColorPicker({ selectedColor, onColorSelect }: ColorPickerProps) {
  return (
    <View style={styles.container}>
      {MEMBER_COLORS.map((color) => (
        <Pressable
          key={color}
          onPress={() => onColorSelect(color)}
          style={[
            styles.colorButton,
            { backgroundColor: color },
            selectedColor === color && styles.selected,
          ]}
        >
          {selectedColor === color && <View style={styles.checkmark} />}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    padding: 8,
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  selected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  checkmark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
});

