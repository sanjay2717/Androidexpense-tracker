import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth';
import { useCategories, useGoals, useTransactions } from './api';
import { Category, Goal, Transaction } from '../types/database';
import { theme } from '../theme';

export type NotificationType =
  | 'budget_exceeded'
  | 'budget_warning'
  | 'goal_complete'
  | 'goal_near'
  | 'idle_reminder'
  | 'monthly_summary';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  timestamp: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  isRead: boolean;
}

// Global subscribers set to sync read state across headers and screens instantly
const subscribers = new Set<() => void>();
function notifySubscribers() {
  subscribers.forEach((fn) => fn());
}

/**
 * Format relative time string
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return diffMin <= 1 ? 'Just now' : `${diffMin}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const storageKey = `@putu_read_notifications_${userId}`;

  // Read notifications from AsyncStorage
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [, setTrigger] = useState(0);

  // Subscribe to live changes
  useEffect(() => {
    const callback = () => setTrigger((t) => t + 1);
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }, []);

  // Load persisted read IDs on user change
  useEffect(() => {
    let isMounted = true;
    async function loadReadIds() {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setReadIds(parsed);
          }
        }
      } catch (err) {
        console.warn('Error loading read notifications:', err);
      } finally {
        if (isMounted) {
          setIsStorageLoaded(true);
        }
      }
    }
    loadReadIds();
    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  // Cached data queries (no extra network fetch loops)
  const { data: categories = [] } = useCategories();
  const { data: goals = [] } = useGoals();
  const { data: transactions = [] } = useTransactions(100);

  // Compute notifications locally
  const notifications: AppNotification[] = useMemo(() => {
    const list: AppNotification[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentYyyyMm = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // ------------------------------------------------------------------------
    // (a) Category budget at 80% or over 100% this month (excluding is_adjustment)
    // ------------------------------------------------------------------------
    const monthExpenses = transactions.filter(
      (tx: Transaction) =>
        tx.type === 'expense' &&
        !tx.is_adjustment &&
        tx.date &&
        tx.date.startsWith(currentYyyyMm)
    );

    categories.forEach((cat: Category) => {
      const limit = Number(cat.budget_limit) || 0;
      if (limit > 0) {
        const spent = monthExpenses
          .filter((tx) => tx.category_id === cat.id)
          .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

        const pct = (spent / limit) * 100;

        if (pct >= 100) {
          const overAmount = Math.round(spent - limit);
          list.push({
            id: `budget-100:${cat.id}:${currentYyyyMm}`,
            type: 'budget_exceeded',
            title: `${cat.name} budget exceeded by ₹${overAmount.toLocaleString('en-IN')}`,
            subtitle: `Total transit spend reached ₹${Math.round(spent).toLocaleString('en-IN')} against your ₹${limit.toLocaleString('en-IN')} budget`,
            timestamp: 'This month',
            icon: cat.icon || 'restaurant',
            iconBg: theme.colors.roseLight,
            iconColor: theme.colors.error,
            isRead: false,
          });
        } else if (pct >= 80) {
          list.push({
            id: `budget-80:${cat.id}:${currentYyyyMm}`,
            type: 'budget_warning',
            title: `${cat.name} budget at ${Math.round(pct)}%`,
            subtitle: `₹${Math.round(spent).toLocaleString('en-IN')} of ₹${limit.toLocaleString('en-IN')} monthly limit spent with days remaining`,
            timestamp: 'This month',
            icon: cat.icon || 'restaurant',
            iconBg: theme.colors.amberLight,
            iconColor: theme.colors.amber,
            isRead: false,
          });
        }
      }
    });

    // ------------------------------------------------------------------------
    // (b) Goal at 90% or complete
    // ------------------------------------------------------------------------
    goals.forEach((goal: Goal) => {
      const target = Number(goal.target_amount) || 0;
      const saved = Number(goal.saved_amount) || 0;

      if (target > 0) {
        const pct = (saved / target) * 100;
        if (pct >= 100) {
          list.push({
            id: `goal-complete:${goal.id}`,
            type: 'goal_complete',
            title: `${goal.name} is complete!`,
            subtitle: `Congratulations! You saved ₹${Math.round(saved).toLocaleString('en-IN')} and reached your target.`,
            timestamp: 'Achieved',
            icon: 'military_tech',
            iconBg: theme.colors.emeraldLight,
            iconColor: theme.colors.emeraldDark,
            isRead: false,
          });
        } else if (pct >= 90) {
          const remaining = Math.round(target - saved);
          list.push({
            id: `goal-90:${goal.id}`,
            type: 'goal_near',
            title: `${goal.name} is ${Math.round(pct)}% complete`,
            subtitle: `You saved ₹${Math.round(saved).toLocaleString('en-IN')}. Only ₹${remaining.toLocaleString('en-IN')} left to reach your goal!`,
            timestamp: 'In progress',
            icon: 'military_tech',
            iconBg: theme.colors.emeraldLight,
            iconColor: theme.colors.emeraldDark,
            isRead: false,
          });
        }
      }
    });

    // ------------------------------------------------------------------------
    // (c) No transactions logged for 3 days
    // ------------------------------------------------------------------------
    if (transactions.length > 0) {
      const validDates = transactions
        .map((t) => (t.date ? new Date(t.date).getTime() : 0))
        .filter((t) => t > 0);

      if (validDates.length > 0) {
        const maxTime = Math.max(...validDates);
        const daysDiff = Math.floor((now.getTime() - maxTime) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 3) {
          const latestDateStr = new Date(maxTime).toISOString().slice(0, 10);
          list.push({
            id: `idle-3d:${latestDateStr}`,
            type: 'idle_reminder',
            title: `No expenses logged for ${daysDiff} days`,
            subtitle: 'Keep your trends accurate by logging any offline or cash spends',
            timestamp: `${daysDiff}d ago`,
            icon: 'schedule',
            iconBg: theme.colors.surfaceContainerLow,
            iconColor: theme.colors.secondary,
            isRead: false,
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // (d) On the first days of a month, summary of previous month
    // ------------------------------------------------------------------------
    if (now.getDate() <= 7) {
      const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const prevYear = prevMonthDate.getFullYear();
      const prevMonth = prevMonthDate.getMonth();
      const prevYyyyMm = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
      const prevMonthName = prevMonthDate.toLocaleString('en-US', { month: 'long' });

      let prevIncome = 0;
      let prevExpenses = 0;

      transactions.forEach((tx: Transaction) => {
        if (tx.is_adjustment) return;
        if (tx.date && tx.date.startsWith(prevYyyyMm)) {
          if (tx.type === 'income') {
            prevIncome += Number(tx.amount) || 0;
          } else {
            prevExpenses += Number(tx.amount) || 0;
          }
        }
      });

      if (prevIncome > 0 || prevExpenses > 0) {
        const savings = prevIncome - prevExpenses;
        list.push({
          id: `monthly-summary:${prevYyyyMm}`,
          type: 'monthly_summary',
          title: `${prevMonthName} summary is ready`,
          subtitle:
            savings >= 0
              ? `You saved ₹${Math.round(savings).toLocaleString('en-IN')} last month. Check out your spending breakdown.`
              : `You spent ₹${Math.round(prevExpenses).toLocaleString('en-IN')} against ₹${Math.round(prevIncome).toLocaleString('en-IN')} income.`,
          timestamp: 'Monthly Digest',
          icon: 'pie_chart',
          iconBg: theme.colors.primaryFixed,
          iconColor: theme.colors.primary,
          isRead: false,
        });
      }
    }

    // Attach read status
    return list.map((item) => ({
      ...item,
      isRead: readIds.includes(item.id),
    }));
  }, [categories, goals, transactions, readIds]);

  // Compute unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Mark a single notification as read
  const markAsRead = useCallback(
    async (id: string) => {
      setReadIds((prev) => {
        if (prev.includes(id)) return prev;
        const updated = [...prev, id];
        AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      notifySubscribers();
    },
    [storageKey]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const merged = Array.from(new Set([...prev, ...allIds]));
      AsyncStorage.setItem(storageKey, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
    notifySubscribers();
  }, [notifications, storageKey]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading: !isStorageLoaded,
  };
}

/**
 * Lightweight hook returning only the unread count for headers
 */
export function useUnreadNotificationsCount(): number {
  const { unreadCount } = useNotifications();
  return unreadCount;
}
