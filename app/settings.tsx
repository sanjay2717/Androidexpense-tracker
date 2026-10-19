import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ShieldCheckIcon, TuneIcon } from '../src/components/Icons';
import { theme } from '../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
    >
      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AP</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.userName}>Aarav Patel</Text>
            <Text style={styles.userEmail}>Anonymous Session Active</Text>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.sectionTitle}>
        <Text style={styles.sectionHeader}>PREFERENCES</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Currency</Text>
          <Text style={styles.rowValue}>INR (₹)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Primary Color</Text>
          <View style={styles.colorPill}>
            <View style={[styles.colorDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.colorText}>Electric Pink</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Haptic Feedback</Text>
          <Text style={styles.rowValue}>Enabled</Text>
        </View>
      </View>

      {/* Security & Sync */}
      <View style={styles.sectionTitle}>
        <Text style={styles.sectionHeader}>SECURITY & DATA</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ShieldCheckIcon size={18} color={theme.colors.emerald} />
            <Text style={[styles.rowLabel, { marginLeft: 8 }]}>Supabase Realtime Sync</Text>
          </View>
          <Text style={[styles.rowValue, { color: theme.colors.emerald }]}>Connected</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>App Version</Text>
          <Text style={styles.rowValue}>Putu v1.0.0</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.85}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.margin,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.md,
    ...theme.shadows.card,
    marginBottom: theme.spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  userEmail: {
    fontSize: 13,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  sectionTitle: {
    paddingHorizontal: 4,
    marginBottom: 6,
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.hairline,
  },
  colorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryMuted,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  colorText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  doneButton: {
    marginTop: 16,
    height: 48,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
