import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';

interface KeypadProps {
  onPressDigit: (char: string) => void;
  onBackspace: () => void;
}

export function NumericKeypad({ onPressDigit, onBackspace }: KeypadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'];

  return (
    <View style={styles.grid}>
      {keys.map((key) => {
        if (key === 'backspace') {
          return (
            <TouchableOpacity
              key={key}
              style={styles.button}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onBackspace();
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Backspace"
            >
              <Text style={styles.backspaceIcon}>⌫</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={key}
            style={styles.button}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPressDigit(key);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Digit ${key}`}
          >
            <Text style={styles.digit}>{key}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  button: {
    width: '31.5%',
    height: 48,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 21,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  backspaceIcon: {
    fontSize: 20,
    color: theme.colors.secondary,
  },
});
