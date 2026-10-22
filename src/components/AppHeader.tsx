import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { theme } from '../theme';
import { useAuth } from '../lib/auth';
import { safeBack } from '../lib/nav';
import { useUnreadNotificationsCount } from '../lib/notifications';
import {
  BellIcon,
  GearIcon,
  ChevronLeftIcon,
  PersonOutlineIcon,
} from './Icons';

export interface HeaderActionButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  icon: React.ReactNode;
  isActive?: boolean;
  variant?: 'surface' | 'primary';
  hasPip?: boolean;
}

/**
 * Common 40x40 circular header action button with 44x44 min hit target (hitSlop),
 * Reanimated 0.97 scale spring on press, light haptic feedback, and optional 8px pip.
 */
export function HeaderActionButton({
  onPress,
  accessibilityLabel,
  icon,
  isActive = false,
  variant = 'surface',
  hasPip = false,
}: HeaderActionButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { duration: 150 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { duration: 150 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[
          styles.actionBtn,
          isPrimary
            ? styles.actionBtnPrimary
            : isActive
            ? styles.actionBtnActive
            : styles.actionBtnSurface,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={0.9}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {icon}
        {hasPip && (
          <View
            style={[
              styles.unreadPip,
              {
                borderColor: isActive
                  ? theme.colors.primaryFixed
                  : theme.colors.surfaceContainerLowest,
              },
            ]}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export interface AppHeaderProps {
  variant: 'tab' | 'stack';
  isHome?: boolean;
  title?: string;
  rightExtra?: React.ReactNode;
  fallbackRoute?: string;
}

/**
 * Universal AppHeader matching Putu Design Spec:
 * - Inset card with 16px side margin, radius 22px, 1px hairline border, iOS-only shadow (elevation 0 on Android).
 * - Fixed height above scroll content with safe-area top inset so nothing jumps between tabs.
 * - Variant "tab":
 *   - Home: 44px avatar -> /profile, greeting and name.
 *   - Other tabs: Title 2 Bold.
 * - Variant "stack":
 *   - safeBack chevron (26px, 44x44 hit area) + left-aligned title.
 * - Action buttons:
 *   - Optional rightExtra slot, Bell, and Gear.
 *   - Gear is active on /settings; Bell is active on /notifications.
 *   - Tapping the current page's active icon does nothing.
 *   - Navigation uses router.navigate so duplicate screens are not stacked.
 */
export function AppHeader({
  variant,
  isHome = false,
  title,
  rightExtra,
  fallbackRoute = '/(tabs)',
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAnonymous } = useAuth();
  const unreadCount = useUnreadNotificationsCount();

  const isSettingsActive = pathname === '/settings';
  const isNotificationsActive = pathname === '/notifications';

  // Navigation handlers
  const handleBellPress = useCallback(() => {
    if (isNotificationsActive) return;
    router.navigate('/notifications' as any);
  }, [isNotificationsActive, router]);

  const handleGearPress = useCallback(() => {
    if (isSettingsActive) return;
    router.navigate('/settings');
  }, [isSettingsActive, router]);

  const handleProfilePress = useCallback(() => {
    if (pathname === '/profile') return;
    router.navigate('/profile');
  }, [pathname, router]);

  const handleBackPress = useCallback(() => {
    safeBack(fallbackRoute);
  }, [fallbackRoute]);

  // User initials & greeting on Home
  const initials = React.useMemo(() => {
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

  const greeting = React.useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'GOOD MORNING';
    if (hours < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }, []);

  const userName = React.useMemo(() => {
    if (isAnonymous) return 'Guest';
    return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Friend';
  }, [user, isAnonymous]);

  // Card height: 68px on Home, 64px on every other page
  const cardHeight = isHome ? 68 : 64;
  // Outer container padding balances the card height so total height is always insets.top + 76
  const verticalPadding = isHome ? 4 : 6;

  return (
    <View
      style={[
        styles.outerContainer,
        {
          paddingTop: insets.top + verticalPadding,
          paddingBottom: verticalPadding,
        },
      ]}
    >
      <View style={[styles.card, { height: cardHeight }]}>
        {/* Left Side */}
        {variant === 'tab' ? (
          isHome ? (
            <TouchableOpacity
              style={styles.homeProfilePill}
              onPress={handleProfilePress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open Profile"
            >
              <View style={styles.avatar}>
                {isAnonymous ? (
                  <PersonOutlineIcon size={20} color={theme.colors.primaryDark} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
                <View style={styles.avatarDot} />
              </View>
              <View style={styles.homeGreetingCol}>
                <Text style={styles.greetingText}>{greeting}</Text>
                <View style={styles.nameRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {userName}
                  </Text>
                  <View style={styles.verifiedDot}>
                    <Text style={styles.verifiedCheck}>✓</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.tabTitleContainer}>
              <Text style={styles.tabTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
          )
        ) : (
          <View style={styles.stackLeftGroup}>
            <TouchableOpacity
              style={styles.chevronButton}
              onPress={handleBackPress}
              hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ChevronLeftIcon size={26} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.stackTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}

        {/* Right Side Actions */}
        <View style={styles.rightActionsGroup}>
          {rightExtra}

          {/* Bell (Notifications) Button */}
          <HeaderActionButton
            onPress={handleBellPress}
            accessibilityLabel="Notifications"
            isActive={isNotificationsActive}
            hasPip={unreadCount > 0 && !isNotificationsActive}
            icon={
              <BellIcon
                size={22}
                color={
                  isNotificationsActive
                    ? theme.colors.primary
                    : theme.colors.secondary
                }
              />
            }
          />

          {/* Gear (Settings) Button */}
          <HeaderActionButton
            onPress={handleGearPress}
            accessibilityLabel="Settings"
            isActive={isSettingsActive}
            icon={
              <GearIcon
                size={22}
                color={
                  isSettingsActive
                    ? theme.colors.primary
                    : theme.colors.secondary
                }
              />
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    backgroundColor: theme.colors.background,
    zIndex: 20,
  },
  card: {
    marginHorizontal: theme.spacing.margin,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card, // 22px
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    // Android Shadow Rule: iOS-only shadow, elevation: 0 on Android to prevent clipped square artifacts
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  homeProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  avatarDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primaryContainer,
    borderWidth: 2,
    borderColor: theme.colors.surfaceContainerLowest,
  },
  homeGreetingCol: {
    justifyContent: 'center',
    flex: 1,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  verifiedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheck: {
    color: theme.colors.surfaceContainerLowest,
    fontSize: 10,
    fontWeight: '900',
  },
  tabTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 4,
  },
  tabTitle: {
    ...theme.typography.title2, // 22px Bold
    color: theme.colors.onSurface,
  },
  stackLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  chevronButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackTitle: {
    ...theme.typography.title3, // 20px Bold
    color: theme.colors.onSurface,
  },
  rightActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  actionBtnSurface: {
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  actionBtnActive: {
    backgroundColor: theme.colors.primaryFixed,
  },
  actionBtnPrimary: {
    backgroundColor: theme.colors.primary,
  },
  unreadPip: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
  },
});
