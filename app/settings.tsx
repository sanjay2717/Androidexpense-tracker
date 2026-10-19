import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ShieldCheckIcon, ChevronRightIcon, PersonOutlineIcon } from '../src/components/Icons';
import { useAuth } from '../src/lib/auth';
import { theme } from '../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAnonymous, signOut } = useAuth();

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const displayName = user?.user_metadata?.display_name || (isAnonymous ? 'Guest User' : 'Account Holder');
  const userIdentifier = isAnonymous ? 'Guest Session' : (user?.email || 'Authenticated User');
  const initials = isAnonymous
    ? 'GU'
    : (user?.user_metadata?.display_name
        ?.split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() ||
      user?.email?.slice(0, 2).toUpperCase() ||
      'PU');

  const handleOpenProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/profile');
  };

  const handleSignOutPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isAnonymous) {
      Alert.alert(
        'Exit Guest Mode?',
        "Guest data can't be recovered after you exit. Create an account first to keep it.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit anyway',
            style: 'destructive',
            onPress: async () => {
              try {
                await signOut();
                router.back();
              } catch (err: any) {
                Alert.alert('Error', err.message);
              }
            },
          },
          {
            text: 'Create account',
            style: 'default',
            onPress: () => {
              router.push('/(auth)/sign-up');
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Log out of Putu?',
        'You will need to sign in again to access your account.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Out',
            style: 'destructive',
            onPress: async () => {
              try {
                await signOut();
                router.back();
              } catch (err: any) {
                Alert.alert('Error Signing Out', err.message || 'Please try again.');
              }
            },
          },
        ]
      );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
    >
      {/* Account Section */}
      <View style={styles.sectionTitle}>
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.avatarRow}
          onPress={handleOpenProfile}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            {isAnonymous ? (
              <PersonOutlineIcon size={24} color={theme.colors.primaryDark} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{userIdentifier}</Text>
          </View>
          <ChevronRightIcon size={20} color={theme.colors.outlineVariant} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.profileRow}
          onPress={handleOpenProfile}
          activeOpacity={0.7}
        >
          <Text style={styles.rowLabel}>View & Edit Profile</Text>
          <ChevronRightIcon size={18} color={theme.colors.outlineVariant} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.signOutRow}
          onPress={handleSignOutPress}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>
            {isAnonymous ? 'Exit guest mode' : 'Sign out'}
          </Text>
        </TouchableOpacity>
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
    paddingBottom: 6,
    paddingTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  userEmail: {
    fontSize: 13,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  signOutRow: {
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.error,
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
    marginVertical: 4,
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
    color: theme.colors.white,
  },
});
