import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { theme } from '../src/theme';
import { AppHeader } from '../src/components/AppHeader';
import {
  useNotifications,
  AppNotification,
} from '../src/lib/notifications';
import {
  DoneAllIcon,
  SpaIcon,
  CheckCircleIcon,
  SmartToyIcon,
  CategoryIcon,
  TrophyIcon,
  ChartIcon,
  CalendarIcon,
} from '../src/components/Icons';

type TabType = 'all' | 'unread' | 'zen';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<TabType>('all');

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    if (activeTab === 'zen') {
      return [];
    }
    return notifications;
  }, [notifications, activeTab]);

  const handleTabChange = useCallback((tab: TabType) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllAsRead();
  }, [markAllAsRead]);

  const handleNotificationPress = useCallback(
    (item: AppNotification) => {
      if (!item.isRead) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        markAsRead(item.id);
      }
    },
    [markAsRead]
  );

  const renderIcon = (item: AppNotification) => {
    switch (item.type) {
      case 'budget_exceeded':
      case 'budget_warning':
        return <CategoryIcon name={item.icon} size={22} color={item.iconColor} />;
      case 'goal_complete':
      case 'goal_near':
        return <TrophyIcon size={22} color={item.iconColor} />;
      case 'monthly_summary':
        return <ChartIcon size={22} color={item.iconColor} />;
      case 'idle_reminder':
      default:
        return <CalendarIcon size={20} color={item.iconColor} />;
    }
  };

  const showEmptyState =
    activeTab === 'zen' ||
    (activeTab === 'unread' && unreadCount === 0) ||
    notifications.length === 0;

  return (
    <View style={styles.container}>
      {/* Universal Inset AppHeader (Stack variant, Bell active) */}
      <AppHeader variant="stack" title="Notifications" />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Interactive Header Bar / Action Plinth */}
        <View style={styles.actionPlinth}>
          <View style={styles.inboxTitleRow}>
            <Text style={styles.inboxTitle}>Inbox</Text>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount} unread
              </Text>
            </View>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllReadBtn}
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <DoneAllIcon size={18} color={theme.colors.primary} />
              <Text style={styles.markAllReadText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Segmented Filter Control */}
        <View style={styles.segmentedContainer}>
          <View style={styles.segmentedTrack}>
            <TouchableOpacity
              style={[
                styles.segmentTab,
                activeTab === 'all' && styles.segmentTabActive,
              ]}
              onPress={() => handleTabChange('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeTab === 'all' && styles.segmentTabTextActive,
                ]}
              >
                All ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                activeTab === 'unread' && styles.segmentTabActive,
              ]}
              onPress={() => handleTabChange('unread')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeTab === 'unread' && styles.segmentTabTextActive,
                ]}
              >
                Unread ({unreadCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                activeTab === 'zen' && styles.segmentTabActive,
              ]}
              onPress={() => handleTabChange('zen')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeTab === 'zen' && styles.segmentTabTextActive,
                ]}
              >
                Zen Mode
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stream of Notifications or Apple-style Empty State */}
        {showEmptyState ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <View style={styles.emptyIconCircle}>
                <SpaIcon size={38} color={theme.colors.primary} />
              </View>
              <View style={styles.emptyBadgeCircle}>
                <CheckCircleIcon size={18} color={theme.colors.emeraldDark} />
              </View>
            </View>

            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={styles.emptySubtitle}>
              No pending budget warnings or unattended alerts right now. Enjoy your
              financial peace!
            </Text>

            {activeTab !== 'all' && notifications.length > 0 && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => handleTabChange('all')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="View All Notifications"
              >
                <Text style={styles.viewAllBtnText}>View All Notifications</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.notificationList}>
            {filteredNotifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notifCard,
                  item.isRead && styles.notifCardRead,
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: item.iconBg },
                  ]}
                >
                  {renderIcon(item)}
                </View>

                <View style={styles.notifBody}>
                  <View style={styles.notifHeaderRow}>
                    <Text
                      style={[
                        styles.notifTitle,
                        item.isRead && styles.notifTitleRead,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.notifTimestamp}>{item.timestamp}</Text>
                  </View>
                  <Text
                    style={styles.notifSubtitle}
                    numberOfLines={2}
                  >
                    {item.subtitle}
                  </Text>
                </View>

                {!item.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Putu Smart Alerts Banner */}
        <View style={styles.tipsBanner}>
          <View style={styles.tipsIconCircle}>
            <SmartToyIcon size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.tipsTextCol}>
            <Text style={styles.tipsTitle}>Putu Smart Alerts</Text>
            <Text style={styles.tipsSubtitle}>
              We nudge you only when daily spending patterns alter drastically.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.margin,
    paddingTop: 8,
    gap: 16,
  },
  actionPlinth: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  inboxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inboxTitle: {
    ...theme.typography.headline,
    color: theme.colors.onSurface,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryMuted,
  },
  unreadBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  markAllReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markAllReadText: {
    ...theme.typography.callout,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  segmentedContainer: {
    width: '100%',
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: 14,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  segmentTabActive: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  segmentTabText: {
    ...theme.typography.callout,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  segmentTabTextActive: {
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  notificationList: {
    gap: 10,
  },
  notifCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
  notifCardRead: {
    opacity: 0.75,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBody: {
    flex: 1,
    justifyContent: 'center',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  notifTitle: {
    ...theme.typography.headline,
    fontSize: 15,
    color: theme.colors.onSurface,
    flex: 1,
  },
  notifTitleRead: {
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  notifTimestamp: {
    ...theme.typography.footnote,
    color: theme.colors.secondary,
  },
  notifSubtitle: {
    ...theme.typography.subheadline,
    fontSize: 13,
    color: theme.colors.secondary,
    lineHeight: 18,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    padding: 28,
    alignItems: 'center',
    textAlign: 'center',
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
  emptyIconContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBadgeCircle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
  },
  emptyTitle: {
    ...theme.typography.title2,
    color: theme.colors.onSurface,
    marginBottom: 6,
  },
  emptySubtitle: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 280,
  },
  viewAllBtn: {
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  viewAllBtnText: {
    ...theme.typography.callout,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  tipsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
  },
  tipsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsTextCol: {
    flex: 1,
  },
  tipsTitle: {
    ...theme.typography.footnote,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginBottom: 2,
  },
  tipsSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    lineHeight: 15,
  },
});
