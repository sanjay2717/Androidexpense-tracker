import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../src/lib/auth';
import { useWalletBalances, useTransactions } from '../src/lib/api';
import { supabase } from '../src/lib/supabase';
import {
  ArrowBackIcon,
  ChevronRightIcon,
  PersonOutlineIcon,
  LogoutIcon,
  CameraIcon,
  CloudSyncIcon,
  MailIcon,
  InfoIcon,
  ShieldCheckIcon,
  ArrowForwardIcon,
} from '../src/components/Icons';
import { theme } from '../src/theme';
import { safeBack } from '../src/lib/nav';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAnonymous, signOut, updateDisplayName } = useAuth();

  const [reduceMotion, setReduceMotion] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editNameText, setEditNameText] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Check accessibility reduce motion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  // Entrance animation values
  const entranceAnim = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      entranceAnim.value = 1;
    } else {
      entranceAnim.value = withSpring(1, { damping: 14, stiffness: 100 });
    }
  }, [reduceMotion]);

  const animatedHeroStyle = useAnimatedStyle(() => ({
    opacity: entranceAnim.value,
    transform: [{ translateY: (1 - entranceAnim.value) * 18 }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: entranceAnim.value,
    transform: [{ translateY: (1 - entranceAnim.value) * 26 }],
  }));

  const userId = user?.id;

  // Fetch real counts from existing auth-gated queries
  const { data: wallets = [] } = useWalletBalances();
  const { data: transactions = [] } = useTransactions();

  const { data: goalsCount = 0 } = useQuery({
    queryKey: ['goals-count', userId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return 0;
      const { count, error } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true });
      if (error && !error.message?.includes('permission denied')) {
        console.warn('Goals count error:', error.message);
      }
      return error ? 0 : (count ?? 0);
    },
    enabled: !!userId,
  });

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const displayName = useMemo(() => {
    if (isAnonymous) return 'Guest';
    return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Friend';
  }, [user, isAnonymous]);

  const emailDisplay = useMemo(() => {
    if (isAnonymous) return 'Local Session · Not synced';
    return user?.email || 'Authenticated User';
  }, [user, isAnonymous]);

  const initials = useMemo(() => {
    if (isAnonymous) return 'GU';
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() || 'PU';
  }, [user, isAnonymous]);

  const memberSinceText = useMemo(() => {
    if (!user?.created_at) return 'Member since 2026';
    const d = new Date(user.created_at);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `Member since ${month} ${year}`;
  }, [user]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    safeBack('/(tabs)');
  };

  const openEditName = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditNameText(displayName);
    setShowEditSheet(true);
  };

  const handleSaveName = async () => {
    if (!editNameText.trim()) return;
    try {
      setIsUpdatingName(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateDisplayName(editNameText.trim());
      setShowEditSheet(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Error updating name', err.message || 'Please try again.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleLogOutPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isAnonymous) {
      // Stronger guest warning
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
      // Standard confirmation for signed-in user
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
                Alert.alert('Error', err.message);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowBackIcon size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRightBadge}>
          <PersonOutlineIcon size={18} color={theme.colors.white} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Identity Section */}
        <Animated.View style={[styles.heroSection, animatedHeroStyle]}>
          <View style={styles.avatarWrapper}>
            {/* Ambient Glow */}
            <View style={styles.avatarGlow} />

            {/* Glowing Gradient Circle */}
            <View style={styles.avatarOuterCircle}>
              <View style={styles.avatarInnerCircle}>
                {isAnonymous ? (
                  <PersonOutlineIcon size={40} color={theme.colors.primary} />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
            </View>

            {/* Edit badge on avatar (signed-in only) */}
            {!isAnonymous && (
              <TouchableOpacity
                style={styles.avatarEditBadge}
                onPress={openEditName}
                activeOpacity={0.8}
              >
                <CameraIcon size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}

            {/* Status dot for guest */}
            {isAnonymous && (
              <View style={styles.guestDotBadge}>
                <View style={styles.guestDotInner} />
              </View>
            )}
          </View>

          <Text style={styles.userNameText}>{displayName}</Text>
          <Text style={styles.userEmailText}>{emailDisplay}</Text>

          {/* Tenure badge / Guest status pill */}
          {isAnonymous ? (
            <View style={styles.guestStatusPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.guestStatusText}>Local Session · Not synced</Text>
            </View>
          ) : (
            <View style={styles.tenureBadgePill}>
              <Text style={styles.tenureBadgeText}>{memberSinceText}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={animatedContentStyle}>
          {/* Guest Variant Callout Banner */}
          {isAnonymous && (
            <View style={styles.guestBanner}>
              <View style={styles.guestBannerContent}>
                <View style={styles.guestBannerIconContainer}>
                  <CloudSyncIcon size={22} color={theme.colors.white} />
                </View>
                <View style={styles.guestBannerTextCol}>
                  <Text style={styles.guestBannerTitle}>Keep your budget safe</Text>
                  <Text style={styles.guestBannerSubtitle}>
                    You're using Putu as a guest. Create an account to keep your data safe across devices.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.guestCreateAccountBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(auth)/sign-up');
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.guestCreateAccountText}>Create account</Text>
                <ArrowForwardIcon size={18} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* Compact 3-Column Stat Badges */}
          <View style={styles.statsRow}>
            {/* Wallets */}
            <View style={styles.statCard}>
              <View style={styles.statDotRow}>
                <Text style={styles.statLabel}>WALLETS</Text>
                <View style={[styles.statDot, { backgroundColor: theme.colors.primary }]} />
              </View>
              <Text style={styles.statNumber}>{wallets.length}</Text>
            </View>

            {/* Transfers */}
            <View style={styles.statCard}>
              <View style={styles.statDotRow}>
                <Text style={styles.statLabel}>TRANSFERS</Text>
                <View style={[styles.statDot, { backgroundColor: theme.colors.tertiary }]} />
              </View>
              <Text style={styles.statNumber}>{transactions.length}</Text>
            </View>

            {/* Goals */}
            <View style={styles.statCard}>
              <View style={styles.statDotRow}>
                <Text style={styles.statLabel}>GOALS</Text>
                <View style={[styles.statDot, { backgroundColor: theme.colors.emerald }]} />
              </View>
              <Text style={styles.statNumber}>{goalsCount}</Text>
            </View>
          </View>

          {/* Group 1: ACCOUNT (Signed-in state) */}
          {!isAnonymous && (
            <View style={styles.groupContainer}>
              <Text style={styles.groupHeader}>ACCOUNT</Text>
              <View style={styles.cardGroup}>
                <TouchableOpacity
                  style={styles.rowItem}
                  onPress={openEditName}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.rowIconBox, { backgroundColor: theme.colors.primaryMuted }]}>
                      <PersonOutlineIcon size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.rowTitle}>Edit name</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowValue}>{displayName}</Text>
                    <ChevronRightIcon size={18} color={theme.colors.outlineVariant} />
                  </View>
                </TouchableOpacity>

                <View style={styles.hairlineDivider} />

                <View style={styles.rowItem}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.rowIconBox, { backgroundColor: theme.colors.tertiaryFixed }]}>
                      <MailIcon size={18} color={theme.colors.tertiary} />
                    </View>
                    <Text style={styles.rowTitle}>Email</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, { maxWidth: 160 }]} numberOfLines={1}>
                      {emailDisplay}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Group 2: PREFERENCES */}
          <View style={styles.groupContainer}>
            <Text style={styles.groupHeader}>PREFERENCES</Text>
            <View style={styles.cardGroup}>
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIconBox, { backgroundColor: theme.colors.emeraldLight }]}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.emeraldDark }}>
                      ₹
                    </Text>
                  </View>
                  <Text style={styles.rowTitle}>Currency</Text>
                </View>
                <View style={styles.rowRight}>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>₹ INR</Text>
                  </View>
                </View>
              </View>

              <View style={styles.hairlineDivider} />

              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIconBox, { backgroundColor: theme.colors.roseLight }]}>
                    <ShieldCheckIcon size={18} color={theme.colors.rose} />
                  </View>
                  <Text style={styles.rowTitle}>Sync Status</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{isAnonymous ? 'Offline / Local' : 'Realtime Active'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Group 3: ABOUT */}
          <View style={styles.groupContainer}>
            <Text style={styles.groupHeader}>ABOUT</Text>
            <View style={styles.cardGroup}>
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIconBox, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
                    <InfoIcon size={18} color={theme.colors.onSurfaceVariant} />
                  </View>
                  <Text style={styles.rowTitle}>Version</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{appVersion}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom Log Out / Exit Action */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogOutPress}
            activeOpacity={0.85}
          >
            <LogoutIcon size={19} color={theme.colors.error} />
            <Text style={styles.logoutButtonText}>
              {isAnonymous ? 'Exit guest mode' : 'Log Out'}
            </Text>
          </TouchableOpacity>

          {/* Footer note */}
          <View style={styles.footnoteRow}>
            <Text style={styles.footnoteText}>
              Putu Expense Tracker • Mindful Rupee Tracking
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit Name Modal Sheet */}
      <Modal
        visible={showEditSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Display Name</Text>
            <Text style={styles.modalSubtitle}>
              This will update your profile and greeting on the home screen.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={editNameText}
              onChangeText={setEditNameText}
              placeholder="e.g. Maya Sharma"
              placeholderTextColor={theme.colors.secondary}
              autoFocus
              autoCapitalize="words"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditSheet(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, isUpdatingName && { opacity: 0.7 }]}
                onPress={handleSaveName}
                disabled={isUpdatingName || !editNameText.trim()}
                activeOpacity={0.88}
              >
                {isUpdatingName ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.margin,
    paddingBottom: 12,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.hairline,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  headerRightBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.margin,
    paddingTop: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarGlow: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: theme.colors.primaryFixed,
    opacity: 0.55,
  },
  avatarOuterCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.colors.primary,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  avatarInnerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 43,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.white,
    letterSpacing: -0.5,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guestDotBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.secondary,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -0.4,
  },
  userEmailText: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  tenureBadgePill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryFixed,
  },
  tenureBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  guestStatusPill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.secondary,
  },
  guestStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  guestBanner: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.primaryFixed,
    ...theme.shadows.card,
  },
  guestBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  guestBannerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBannerTextCol: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  guestBannerSubtitle: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 3,
    lineHeight: 18,
  },
  guestCreateAccountBtn: {
    height: 46,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  guestCreateAccountText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 14,
    minHeight: 88,
    justifyContent: 'space-between',
    ...theme.shadows.card,
  },
  statDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.secondary,
    letterSpacing: 0.6,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -0.5,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  cardGroup: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  currencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: theme.colors.surfaceContainerLow,
    marginLeft: 62,
  },
  logoutButton: {
    marginTop: 8,
    height: 52,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.roseLight,
    ...theme.shadows.card,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.error,
  },
  footnoteRow: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  footnoteText: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalSheet: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    ...theme.shadows.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.onSurface,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  modalInput: {
    height: 48,
    borderRadius: theme.radii.input,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 16,
    fontSize: 15,
    color: theme.colors.onSurface,
    marginTop: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radii.sm,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  modalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.primary,
    minWidth: 70,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
