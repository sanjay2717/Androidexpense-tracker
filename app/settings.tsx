import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PersonOutlineIcon,
  CheckCircleIcon,
  CashIcon,
  SunIcon,
  GridIcon,
  WalletIcon,
  ShareIcon,
  NorthEastIcon,
  TrashIcon,
  InfoIcon,
  ShieldCheckIcon,
  LogoutIcon,
} from '../src/components/Icons';
import { useAuth } from '../src/lib/auth';
import { useCategories, useDeleteAllTransactions } from '../src/lib/api';
import { exportTransactionsToCsv } from '../src/lib/csvExport';
import { safeBack } from '../src/lib/nav';
import { supabase } from '../src/lib/supabase';
import { theme } from '../src/theme';
import { AppHeader } from '../src/components/AppHeader';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAnonymous, signOut } = useAuth();
  const { data: categories = [] } = useCategories();
  const deleteAllMutation = useDeleteAllTransactions();

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayName =
    user?.user_metadata?.display_name || (isAnonymous ? 'Guest User' : 'Putu User');
  const userIdentifier = isAnonymous ? 'Guest' : (user?.email || 'Guest');
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

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    safeBack('/(tabs)');
  };

  const handleOpenProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.navigate('/profile');
  };

  const handleOpenCategories = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/categories' as any);
  };

  const handleOpenWallets = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/wallet');
  };

  const handleExportCsv = async () => {
    if (isExporting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExporting(true);

    try {
      const result = await exportTransactionsToCsv();
      if (result.count === 0) {
        Alert.alert('Export Notice', 'Your exported file contains 0 transactions.');
      }
    } catch (err: any) {
      console.warn('CSV export error:', err);
      Alert.alert('Export Failed', err.message || 'Unable to generate CSV export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllTransactions = async () => {
    if (isDeleting) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Step 1: First Confirmation
    Alert.alert(
      'Delete All Transactions?',
      'This will remove all transaction records from your account. Your wallets, categories, and budgets will stay. Would you like to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              // Fetch exact count of user's transactions
              const { count, error } = await supabase
                .from('transactions')
                .select('id', { count: 'exact', head: true });

              setIsDeleting(false);

              if (error) {
                Alert.alert('Error', error.message || 'Could not verify transaction count.');
                return;
              }

              const txCount = count ?? 0;
              if (txCount === 0) {
                Alert.alert('No Transactions', 'You do not have any transactions to delete.');
                return;
              }

              // Step 2: Second Confirmation explicitly naming the count
              Alert.alert(
                'Confirm Deletion',
                `This will permanently delete all ${txCount} transaction${
                  txCount === 1 ? '' : 's'
                }. This action cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: `Delete All (${txCount})`,
                    style: 'destructive',
                    onPress: async () => {
                      setIsDeleting(true);
                      try {
                        await deleteAllMutation.mutateAsync();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Success', `Successfully deleted all ${txCount} transactions.`);
                      } catch (deleteErr: any) {
                        Alert.alert('Deletion Failed', deleteErr.message || 'Please try again.');
                      } finally {
                        setIsDeleting(false);
                      }
                    },
                  },
                ]
              );
            } catch (err: any) {
              setIsDeleting(false);
              Alert.alert('Error', err.message || 'Failed to inspect transactions.');
            }
          },
        },
      ]
    );
  };

  const handlePrivacyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Privacy Policy',
      'Putu is designed with privacy at its core. Your financial data is securely stored in your private database and is never shared, sold, or used for advertising.'
    );
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
    <View style={styles.screen}>
      {/* Universal Inset AppHeader (Stack variant, Gear active) */}
      <AppHeader variant="stack" title="Settings" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40, paddingTop: 10 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Profile Hero Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={handleOpenProfile}
          activeOpacity={0.7}
        >
          <View style={styles.profileLeft}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarInitials}>{initials}</Text>
              <View style={styles.statusDotWrapper}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isAnonymous ? theme.colors.amber : theme.colors.emerald },
                  ]}
                />
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {userIdentifier}
              </Text>
              <View style={styles.profileBadgeRow}>
                <CheckCircleIcon
                  size={12}
                  color={isAnonymous ? theme.colors.amber : theme.colors.emeraldDark}
                />
                <Text
                  style={[
                    styles.profileBadgeText,
                    { color: isAnonymous ? theme.colors.amber : theme.colors.emeraldDark },
                  ]}
                >
                  {isAnonymous ? 'Guest Mode' : 'Linked Account'}
                </Text>
              </View>
            </View>
          </View>

          <ChevronRightIcon size={20} color={theme.colors.outlineVariant} />
        </TouchableOpacity>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
          <View style={styles.cardGroup}>
            {/* Currency Row (Static, no pickers) */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconContainer, { backgroundColor: theme.colors.primaryFixed }]}>
                  <CashIcon size={18} color={theme.colors.primaryDark} />
                </View>
                <Text style={styles.rowLabel}>Currency</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>₹ INR</Text>
                <ChevronRightIcon size={18} color={theme.colors.outlineVariant} />
              </View>
            </View>

            <View style={styles.hairlineDivider} />

            {/* Appearance Row (Static, no pickers) */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconContainer, { backgroundColor: theme.colors.amberLight }]}>
                  <SunIcon size={18} color={theme.colors.amber} />
                </View>
                <Text style={styles.rowLabel}>Appearance</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>Light</Text>
                <ChevronRightIcon size={18} color={theme.colors.outlineVariant} />
              </View>
            </View>
          </View>
        </View>

        {/* Manage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>MANAGE</Text>
          <View style={styles.cardGroup}>
            {/* Categories Row */}
            <TouchableOpacity
              style={styles.row}
              onPress={handleOpenCategories}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconContainer, { backgroundColor: theme.colors.primaryFixed }]}>
                  <GridIcon size={18} color={theme.colors.primaryDark} />
                </View>
                <Text style={styles.rowLabel}>Categories</Text>
              </View>
              <View style={styles.rowRight}>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{categories.length}</Text>
                </View>
                <ChevronRightIcon size={18} color={theme.colors.outlineVariant} />
              </View>
            </TouchableOpacity>

            <View style={styles.hairlineDivider} />

            {/* Wallets Row */}
            <TouchableOpacity
              style={styles.row}
              onPress={handleOpenWallets}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconContainer, { backgroundColor: theme.colors.tertiaryFixed }]}>
                  <WalletIcon size={18} color={theme.colors.tertiary} />
                </View>
                <Text style={styles.rowLabel}>Wallets</Text>
              </View>
              <View style={styles.rowRight}>
                <ChevronRightIcon size={18} color={theme.colors.outlineVariant} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA</Text>
          <View style={styles.cardGroup}>
            {/* Export to CSV Row */}
            <TouchableOpacity
              style={styles.row}
              onPress={handleExportCsv}
              disabled={isExporting}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconContainer, { backgroundColor: theme.colors.emeraldLight }]}>
                  <ShareIcon size={18} color={theme.colors.emeraldDark} />
                </View>
                <Text style={styles.rowLabel}>
                  {isExporting ? 'Exporting CSV...' : 'Export to CSV'}
                </Text>
              </View>
              <View style={styles.rowRight}>
                {isExporting ? (
                  <ActivityIndicator size="small" color={theme.colors.emeraldDark} />
                ) : (
                  <NorthEastIcon size={18} color={theme.colors.outlineVariant} />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.hairlineDivider} />

            {/* Delete All Transactions Row */}
            <TouchableOpacity
              style={styles.row}
              onPress={handleDeleteAllTransactions}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconContainer, { backgroundColor: theme.colors.roseLight }]}>
                  <TrashIcon size={18} color={theme.colors.error} />
                </View>
                <Text style={[styles.rowLabel, { color: theme.colors.error }]}>
                  {isDeleting ? 'Deleting transactions...' : 'Delete all transactions'}
                </Text>
              </View>
              <View style={styles.rowRight}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                  <ChevronRightIcon size={18} color={theme.colors.outlineVariant} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ABOUT</Text>
          <View style={styles.cardGroup}>
            {/* Version Row */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconContainer, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                  <InfoIcon size={18} color={theme.colors.secondary} />
                </View>
                <Text style={styles.rowLabel}>Version</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{appVersion}</Text>
              </View>
            </View>

            <View style={styles.hairlineDivider} />

            {/* Privacy Policy Row */}
            <TouchableOpacity
              style={styles.row}
              onPress={handlePrivacyPress}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.rowIconContainer, { backgroundColor: theme.colors.tertiaryFixed }]}>
                  <ShieldCheckIcon size={18} color={theme.colors.tertiary} />
                </View>
                <Text style={styles.rowLabel}>Privacy Policy</Text>
              </View>
              <View style={styles.rowRight}>
                <ChevronRightIcon size={18} color={theme.colors.outlineVariant} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Log out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleSignOutPress}
          activeOpacity={0.8}
        >
          <LogoutIcon size={18} color={theme.colors.error} />
          <Text style={styles.logoutText}>
            {isAnonymous ? 'Exit Guest Mode' : 'Log out'}
          </Text>
        </TouchableOpacity>

        {/* App Stamp Footer */}
        <View style={styles.footerStamp}>
          <Text style={styles.footerStampText}>Putu · Made with care</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.margin,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    marginLeft: 2,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.margin,
    paddingTop: theme.spacing.sm,
  },
  largeTitleContainer: {
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -0.8,
  },
  profileCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.card,
    marginBottom: theme.spacing.lg,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  statusDotWrapper: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  profileInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
    marginLeft: 16,
    marginBottom: theme.spacing.xs,
  },
  cardGroup: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  rowIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowLabel: {
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 16,
    color: theme.colors.secondary,
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.hairline,
    marginLeft: 60,
  },
  countBadge: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
  },
  logoutButton: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.card,
    marginTop: theme.spacing.xs,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
  },
  footerStamp: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  footerStampText: {
    fontSize: 12,
    color: theme.colors.secondary,
  },
});
