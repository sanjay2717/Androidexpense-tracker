import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartIcon } from '../../src/components/Icons';
import { theme } from '../../src/theme';

export default function ReportScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <ChartIcon size={36} color={theme.colors.emerald} />
        </View>
        <Text style={styles.title}>Financial Reports</Text>
        <Text style={styles.subtitle}>
          Deep analytics on your spending habits, trends, and category distribution.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.emeraldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
