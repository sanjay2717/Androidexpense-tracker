import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

import { theme } from '../src/theme';
import { safeBack } from '../src/lib/nav';
import { useAuth } from '../src/lib/auth';
import { formatMoney } from '../src/lib/format';
import {
  useAllTransactions,
  useDeleteTransaction,
  fetchCategories,
  fetchWalletBalances,
} from '../src/lib/api';
import { Transaction, Category, WalletBalance } from '../src/types/database';
import {
  ChevronLeftIcon,
  TuneIcon,
  SearchIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  PencilIcon,
  TrashIcon,
  CategoryIcon,
  WalletIcon,
  CalendarIcon,
  PlusIcon,
} from '../src/components/Icons';
import { TransactionsSkeleton } from '../src/components/Skeleton';
import { AppHeader, HeaderActionButton } from '../src/components/AppHeader';

type TransactionTypeFilter = 'all' | 'expense' | 'income' | 'adjustment';
type DatePreset = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom';

interface DateBounds {
  startDate: string;
  endDate: string;
  label: string;
}

function getDateRangeBounds(
  preset: DatePreset,
  customStart?: Date,
  customEnd?: Date
): DateBounds {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (preset === 'this_month') {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      label: 'This month',
    };
  }

  if (preset === 'last_month') {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      label: 'Last month',
    };
  }

  if (preset === 'this_year') {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      label: 'This year',
    };
  }

  if (preset === 'custom' && customStart && customEnd) {
    const startStr = customStart.toISOString().split('T')[0];
    const endStr = customEnd.toISOString().split('T')[0];
    const fmtStart = customStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const fmtEnd = customEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return {
      startDate: startStr,
      endDate: endStr,
      label: `${fmtStart} - ${fmtEnd}`,
    };
  }

  // Default: last_3_months
  const start = new Date(year, month - 2, 1);
  const end = new Date(year, month + 1, 0);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    label: 'Last 3 months',
  };
}

function formatDayHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  if (target.getTime() === today.getTime()) {
    return 'Today';
  }
  if (target.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  return target.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

type ListItem =
  | {
      type: 'header';
      id: string;
      title: string;
      netTotal: number;
    }
  | {
      type: 'row';
      id: string;
      tx: Transaction;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
    };

// ============================================================================
// ONE Shared FilterChip Component
// Solid background, borderRadius = height / 2, hairline border, ZERO shadow/elevation,
// with Android ripple cleanly clipped by an outer wrapper View with overflow: 'hidden'.
// ============================================================================
const CHIP_HEIGHT = 32;

interface FilterChipProps {
  label: string;
  isActive?: boolean;
  isSelected?: boolean;
  isClear?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}

const FilterChip = React.memo(function FilterChip({
  label,
  isActive = false,
  isSelected = false,
  isClear = false,
  iconLeft,
  iconRight,
  onPress,
  accessibilityLabel,
}: FilterChipProps) {
  let bg: string = theme.colors.surfaceContainerLowest;
  let border: string = theme.colors.outlineVariant;
  let textColor: string = theme.colors.secondary;
  let rippleColor: string = 'rgba(0, 0, 0, 0.08)';

  if (isClear) {
    bg = theme.colors.roseLight;
    border = theme.colors.roseLight;
    textColor = theme.colors.error;
    rippleColor = 'rgba(186, 26, 26, 0.12)';
  } else if (isActive) {
    bg = theme.colors.primary;
    border = theme.colors.primary;
    textColor = '#ffffff';
    rippleColor = 'rgba(255, 255, 255, 0.25)';
  } else if (isSelected) {
    bg = theme.colors.primaryFixed;
    border = theme.colors.primary;
    textColor = theme.colors.primary;
    rippleColor = 'rgba(255, 45, 120, 0.15)';
  }

  return (
    <View
      style={[
        styles.chipWrapper,
        {
          backgroundColor: bg,
          borderColor: border,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        android_ripple={{
          color: rippleColor,
          borderless: false,
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        style={({ pressed }) => [
          styles.chipInner,
          pressed && Platform.OS === 'ios' && { opacity: 0.7 },
        ]}
      >
        {iconLeft ? <View style={styles.chipIconLeftWrap}>{iconLeft}</View> : null}
        <Text
          style={[
            styles.chipText,
            { color: textColor },
            (isActive || isSelected || isClear) && styles.chipTextBold,
          ]}
        >
          {label}
        </Text>
        {iconRight ? <View style={styles.chipIconRightWrap}>{iconRight}</View> : null}
      </Pressable>
    </View>
  );
});

// ============================================================================
// Clean, Static Memoized Transaction Row Component
// Removed Reanimated hooks and timers to eliminate ghost frames on recycled items.
// ============================================================================
const TransactionRowItem = React.memo(function TransactionRowItem({
  tx,
  isFirstInGroup,
  isLastInGroup,
  onPress,
}: {
  tx: Transaction;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onPress: (tx: Transaction) => void;
}) {
  const isIncome = tx.type === 'income';
  const categoryName = tx.category?.name || 'Uncategorized';
  const walletName = tx.wallet?.name || 'Wallet';
  const displayTitle = tx.note?.trim() || categoryName;

  let iconBg: string = theme.colors.primaryFixed;
  let iconColor: string = theme.colors.primary;
  if (isIncome) {
    iconBg = '#E1F7EC';
    iconColor = '#0E8A54';
  } else if (tx.is_adjustment) {
    iconBg = theme.colors.surfaceContainerHigh;
    iconColor = theme.colors.secondary;
  }

  return (
    <View style={styles.rowWrapper}>
      <TouchableOpacity
        style={[
          styles.rowItem,
          isFirstInGroup && styles.rowFirst,
          isLastInGroup && styles.rowLast,
        ]}
        onPress={() => onPress(tx)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.rowIconCircle, { backgroundColor: iconBg }]}>
            <CategoryIcon
              name={tx.note || categoryName}
              color={iconColor}
              size={20}
            />
          </View>
          <View style={styles.rowTextCol}>
            <View style={styles.rowTitleRow}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {displayTitle}
              </Text>
              {tx.is_adjustment ? (
                <View style={styles.adjustmentPill}>
                  <Text style={styles.adjustmentPillText}>Adjustment</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {categoryName} · {walletName}
            </Text>
          </View>
        </View>

        <View style={styles.rowRight}>
          <Text
            style={[
              styles.rowAmount,
              isIncome && styles.rowAmountIncome,
            ]}
            numberOfLines={1}
          >
            {formatMoney(
              isIncome ? tx.amount : tx.is_adjustment ? tx.amount : -tx.amount,
              {
                showPositiveSign: isIncome,
                decimals: 0,
              }
            )}
          </Text>
        </View>
      </TouchableOpacity>
      {!isLastInGroup && <View style={styles.rowDivider} />}
    </View>
  );
});

// ============================================================================
// Memoized Day Header Item Component (Rendered as normal row in list)
// ============================================================================
const TransactionHeaderItem = React.memo(function TransactionHeaderItem({
  title,
  netTotal,
}: {
  title: string;
  netTotal: number;
}) {
  const netText = formatMoney(netTotal, { showPositiveSign: true, decimals: 0 });

  return (
    <View style={styles.dayHeader}>
      <Text style={styles.dayHeaderTitle}>{title}</Text>
      <Text style={styles.dayHeaderNet}>{netText}</Text>
    </View>
  );
});

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('last_3_months');

  // Custom Date Picker States
  const [customStartDate, setCustomStartDate] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1)
  );
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

  // Bottom Sheets Visibility
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [showDateRangeSheet, setShowDateRangeSheet] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Pull to refresh
  const [refreshing, setRefreshing] = useState(false);

  // Entities loaded for filters
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [categorySearch, setCategorySearch] = useState('');

  // Debounce search input by 250ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load categories and wallets for sheets
  useEffect(() => {
    Promise.all([fetchCategories(), fetchWalletBalances()])
      .then(([cats, wals]) => {
        setCategories(cats);
        setWallets(wals);
      })
      .catch((err) => {
        console.warn('Error loading filter options:', err);
      });
  }, []);

  // Compute Active Date Bounds
  const dateBounds = useMemo(() => {
    return getDateRangeBounds(datePreset, customStartDate, customEndDate);
  }, [datePreset, customStartDate, customEndDate]);

  // Transactions Query
  const {
    data: rawTransactions = [],
    isLoading,
    refetch,
  } = useAllTransactions({
    startDate: dateBounds.startDate,
    endDate: dateBounds.endDate,
  });

  const deleteTxMutation = useDeleteTransaction();

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Active filter status
  const isFilterActive = useMemo(() => {
    return (
      debouncedSearch.trim().length > 0 ||
      typeFilter !== 'all' ||
      selectedCategoryIds.length > 0 ||
      selectedWalletIds.length > 0 ||
      datePreset !== 'last_3_months'
    );
  }, [debouncedSearch, typeFilter, selectedCategoryIds, selectedWalletIds, datePreset]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery('');
    setDebouncedSearch('');
    setTypeFilter('all');
    setSelectedCategoryIds([]);
    setSelectedWalletIds([]);
    setDatePreset('last_3_months');
  }, []);

  // Filtered Transactions in useMemo
  const filteredTransactions = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    return rawTransactions.filter((tx) => {
      // 1. Type Filter
      if (typeFilter === 'expense' && (tx.type !== 'expense' || tx.is_adjustment)) return false;
      if (typeFilter === 'income' && (tx.type !== 'income' || tx.is_adjustment)) return false;
      if (typeFilter === 'adjustment' && !tx.is_adjustment) return false;

      // 2. Category Filter
      if (selectedCategoryIds.length > 0) {
        const catKey = tx.category_id || 'uncategorized';
        if (!selectedCategoryIds.includes(catKey)) return false;
      }

      // 3. Wallet Filter
      if (selectedWalletIds.length > 0) {
        if (!tx.wallet_id || !selectedWalletIds.includes(tx.wallet_id)) return false;
      }

      // 4. Search Filter
      if (query.length > 0) {
        const noteMatch = (tx.note || '').toLowerCase().includes(query);
        const catName = (tx.category?.name || 'Uncategorized').toLowerCase();
        const catMatch = catName.includes(query);
        const walletName = (tx.wallet?.name || '').toLowerCase();
        const walletMatch = walletName.includes(query);
        const amountStr = String(tx.amount);
        const amountMatch = amountStr.includes(query) || `₹${amountStr}`.includes(query);

        if (!noteMatch && !catMatch && !walletMatch && !amountMatch) {
          return false;
        }
      }

      return true;
    });
  }, [rawTransactions, debouncedSearch, typeFilter, selectedCategoryIds, selectedWalletIds]);

  // Summary Metrics (Excluding is_adjustment rows from spent and earned)
  const summary = useMemo(() => {
    let spent = 0;
    let earned = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.is_adjustment) return;
      if (tx.type === 'income') {
        earned += tx.amount;
      } else {
        spent += tx.amount;
      }
    });

    return {
      count: filteredTransactions.length,
      spent,
      earned,
    };
  }, [filteredTransactions]);

  // Flattened List items with Day Headers as standard rows (NO stickyHeaderIndices)
  const listItems = useMemo(() => {
    const groups: { [dateKey: string]: Transaction[] } = {};

    filteredTransactions.forEach((tx) => {
      const dateKey = (tx.date || '').slice(0, 10) || 'Unknown';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });

    const items: ListItem[] = [];

    Object.keys(groups).forEach((dateKey) => {
      const txsInDay = groups[dateKey];
      // Calculate net total for this day (excluding adjustments)
      let dayNet = 0;
      txsInDay.forEach((t) => {
        if (t.is_adjustment) return;
        if (t.type === 'income') {
          dayNet += t.amount;
        } else {
          dayNet -= t.amount;
        }
      });

      // Day header item as normal row
      items.push({
        type: 'header',
        id: `header-${dateKey}`,
        title: dateKey === 'Unknown' ? 'Earlier' : formatDayHeader(dateKey),
        netTotal: dayNet,
      });

      // Rows in group
      txsInDay.forEach((t, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === txsInDay.length - 1;
        items.push({
          type: 'row',
          id: t.id,
          tx: t,
          isFirstInGroup: isFirst,
          isLastInGroup: isLast,
        });
      });
    });

    return items;
  }, [filteredTransactions]);

  // Row Press Handler -> Open Details Bottom Sheet
  const handleRowPress = useCallback((tx: Transaction) => {
    Haptics.selectionAsync();
    setSelectedTx(tx);
  }, []);

  // Edit Transaction Action -> Dismiss sheet then navigate to /add?id=... without modal collision
  const handleEditPress = useCallback(() => {
    if (!selectedTx) return;
    const txId = selectedTx.id;
    setSelectedTx(null);
    setTimeout(() => {
      router.push(`/add?id=${txId}` as any);
    }, Platform.OS === 'ios' ? 120 : 80);
  }, [selectedTx, router]);

  // Delete Transaction Action -> Confirm Alert & Invalidate
  const handleDeletePress = useCallback(() => {
    if (!selectedTx) return;
    const txToDelete = selectedTx;

    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTxMutation.mutateAsync(txToDelete.id);
              setSelectedTx(null);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete transaction.');
            }
          },
        },
      ]
    );
  }, [selectedTx, deleteTxMutation]);

  // Category Toggle in Sheet
  const handleToggleCategory = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  // Wallet Toggle in Sheet
  const handleToggleWallet = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedWalletIds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  }, []);

  // Date Range Picker Handler
  const handleDateValueChange = (_event: any, selectedDate: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (!selectedDate) return;

    if (datePickerMode === 'start') {
      setCustomStartDate(selectedDate);
      if (Platform.OS === 'android') {
        setTimeout(() => {
          setDatePickerMode('end');
          setShowDatePicker(true);
        }, 150);
      }
    } else {
      setCustomEndDate(selectedDate);
      setDatePreset('custom');
      setShowDateRangeSheet(false);
    }
  };

  // Render FlashList Item
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
        return (
          <TransactionHeaderItem
            title={item.title}
            netTotal={item.netTotal}
          />
        );
      }

      return (
        <TransactionRowItem
          tx={item.tx}
          isFirstInGroup={item.isFirstInGroup}
          isLastInGroup={item.isLastInGroup}
          onPress={handleRowPress}
        />
      );
    },
    [handleRowPress]
  );

  return (
    <View style={styles.screen}>
      {/* Universal Inset AppHeader (Stack variant, left title, filter in rightExtra) */}
      <AppHeader
        variant="stack"
        title="Transactions"
        rightExtra={
          <HeaderActionButton
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCategorySheet(true);
            }}
            accessibilityLabel="Filters"
            hasPip={isFilterActive}
            icon={<TuneIcon size={22} color={theme.colors.onSurface} />}
          />
        }
      />

      {/* Main Body */}
      {isLoading ? (
        <TransactionsSkeleton />
      ) : (
        <View style={styles.body}>
          {/* ================================================================ */}
          {/* FIXED FILTER & SUMMARY AREA (Stays above the scrolling FlashList) */}
          {/* ================================================================ */}
          <View style={styles.fixedFilterArea}>
            {/* Search Input Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <SearchIcon size={20} color={theme.colors.secondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search notes, categories, wallets, amounts"
                  placeholderTextColor={theme.colors.secondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && Platform.OS !== 'ios' && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CloseIcon size={16} color={theme.colors.secondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Horizontal Filter Chips Scroller */}
            <View style={styles.chipScrollContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScrollContent}
              >
                {/* Type Chips */}
                <FilterChip
                  label="All"
                  isActive={typeFilter === 'all'}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTypeFilter('all');
                  }}
                />

                <FilterChip
                  label="Expenses"
                  isActive={typeFilter === 'expense'}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTypeFilter('expense');
                  }}
                />

                <FilterChip
                  label="Income"
                  isActive={typeFilter === 'income'}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTypeFilter('income');
                  }}
                />

                <FilterChip
                  label="Adjustments"
                  isActive={typeFilter === 'adjustment'}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTypeFilter('adjustment');
                  }}
                />

                <View style={styles.chipDivider} />

                {/* Category Dropdown Chip */}
                <FilterChip
                  label={
                    selectedCategoryIds.length === 0
                      ? 'Category'
                      : `Category (${selectedCategoryIds.length})`
                  }
                  isSelected={selectedCategoryIds.length > 0}
                  iconRight={
                    <ChevronDownIcon
                      size={14}
                      color={
                        selectedCategoryIds.length > 0
                          ? theme.colors.primary
                          : theme.colors.secondary
                      }
                    />
                  }
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowCategorySheet(true);
                  }}
                />

                {/* Wallet Dropdown Chip */}
                <FilterChip
                  label={
                    selectedWalletIds.length === 0
                      ? 'Wallet'
                      : `Wallet (${selectedWalletIds.length})`
                  }
                  isSelected={selectedWalletIds.length > 0}
                  iconRight={
                    <ChevronDownIcon
                      size={14}
                      color={
                        selectedWalletIds.length > 0
                          ? theme.colors.primary
                          : theme.colors.secondary
                      }
                    />
                  }
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowWalletSheet(true);
                  }}
                />

                {/* Date Range Chip */}
                <FilterChip
                  label={dateBounds.label}
                  isSelected={datePreset !== 'last_3_months'}
                  iconRight={
                    <ChevronDownIcon
                      size={14}
                      color={
                        datePreset !== 'last_3_months'
                          ? theme.colors.primary
                          : theme.colors.secondary
                      }
                    />
                  }
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowDateRangeSheet(true);
                  }}
                />

                {/* Clear Filters Action Chip */}
                {isFilterActive && (
                  <FilterChip
                    label="Clear"
                    isClear
                    iconLeft={<CloseIcon size={12} color={theme.colors.error} />}
                    onPress={handleClearFilters}
                  />
                )}
              </ScrollView>
            </View>

            {/* Slim Summary Strip */}
            <View style={styles.summaryStripContainer}>
              <View style={styles.summaryStrip}>
                <View style={styles.summaryCountRow}>
                  <View style={styles.summaryDot} />
                  <Text style={styles.summaryCountText}>
                    {summary.count} {summary.count === 1 ? 'transaction' : 'transactions'}
                  </Text>
                </View>
                <View style={styles.summaryTotalsRow}>
                  <Text style={styles.summarySpentText}>
                    Spent {formatMoney(summary.spent > 0 ? -summary.spent : 0, { decimals: 0 })}
                  </Text>
                  <Text style={styles.summaryDivider}>·</Text>
                  <Text style={styles.summaryEarnedText}>
                    Earned {formatMoney(summary.earned, { showPositiveSign: true, decimals: 0 })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Limit Notification Notice (if 2000 reached) */}
            {rawTransactions.length >= 2000 && (
              <View style={styles.limitBanner}>
                <Text style={styles.limitBannerText}>
                  Showing latest 2,000 transactions for this range.
                </Text>
              </View>
            )}
          </View>

          {/* ================================================================ */}
          {/* LIST CONTAINER (flex: 1 natural scroll container)                */}
          {/* ================================================================ */}
          <View style={styles.listContainer}>
            {filteredTransactions.length === 0 ? (
              rawTransactions.length === 0 && !isFilterActive ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <WalletIcon size={36} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>No transactions yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Record your expenses or income to track your activity.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={() => router.push('/add' as any)}
                    activeOpacity={0.85}
                  >
                    <PlusIcon size={18} color="#ffffff" />
                    <Text style={styles.emptyAddBtnText}>Add Transaction</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <SearchIcon size={32} color={theme.colors.secondary} />
                  </View>
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptySubtitle}>
                    Try clearing or adjusting your search filters to find what you're looking for.
                  </Text>
                  <TouchableOpacity
                    style={styles.clearResultsBtn}
                    onPress={handleClearFilters}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.clearResultsBtnText}>Clear filters</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <FlashList
                data={listItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                getItemType={(item) => item.type}
                contentContainerStyle={{
                  paddingHorizontal: theme.spacing.margin,
                  paddingBottom: Math.max(insets.bottom, 24) + 16,
                }}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            )}
          </View>
        </View>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: Transaction Details Bottom Sheet            */}
      {/* ==================================================== */}
      <Modal
        visible={!!selectedTx}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedTx(null)}
          />
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            {/* Grab Handle */}
            <View style={styles.sheetHandleWrapper}>
              <View style={styles.sheetHandle} />
            </View>

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Transaction Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedTx(null)}
                style={styles.sheetCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <CloseIcon size={18} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={styles.detailsContent}
              >
                {/* Visual Hero / Big Amount Section */}
                <View style={styles.heroSection}>
                  <View style={styles.heroCategoryPill}>
                    <CategoryIcon
                      name={selectedTx.note || selectedTx.category?.name}
                      size={14}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.heroCategoryText}>
                      {selectedTx.category?.name || 'Uncategorized'}
                    </Text>
                  </View>

                  <Text style={styles.heroAmountText}>
                    {formatMoney(
                      selectedTx.type === 'income'
                        ? selectedTx.amount
                        : selectedTx.is_adjustment
                        ? selectedTx.amount
                        : -selectedTx.amount,
                      {
                        showPositiveSign: selectedTx.type === 'income',
                        decimals: 2,
                      }
                    )}
                  </Text>

                  <Text style={styles.heroStatusText}>
                    {selectedTx.is_adjustment
                      ? 'Wallet Adjustment'
                      : selectedTx.type === 'income'
                      ? 'Confirmed • Income'
                      : 'Confirmed • Expense'}
                  </Text>
                </View>

                {/* Grouped Inset Card */}
                <View style={styles.detailsCard}>
                  {/* Category Row */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailsRowLeft}>
                      <View style={styles.detailsIconCircle}>
                        <CategoryIcon
                          name={selectedTx.note || selectedTx.category?.name}
                          size={16}
                          color={theme.colors.primary}
                        />
                      </View>
                      <Text style={styles.detailsLabel}>Category</Text>
                    </View>
                    <Text style={styles.detailsValue}>
                      {selectedTx.category?.name || 'Uncategorized'}
                    </Text>
                  </View>

                  <View style={styles.detailsDivider} />

                  {/* Wallet Row */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailsRowLeft}>
                      <View style={styles.detailsIconCircle}>
                        <WalletIcon size={16} color={theme.colors.secondary} />
                      </View>
                      <Text style={styles.detailsLabel}>Wallet</Text>
                    </View>
                    <Text style={styles.detailsValue}>
                      {selectedTx.wallet?.name || 'Wallet'}
                    </Text>
                  </View>

                  <View style={styles.detailsDivider} />

                  {/* Date Row */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailsRowLeft}>
                      <View style={styles.detailsIconCircle}>
                        <CalendarIcon size={16} color={theme.colors.secondary} />
                      </View>
                      <Text style={styles.detailsLabel}>Date</Text>
                    </View>
                    <Text style={styles.detailsValue}>
                      {selectedTx.date
                        ? new Date(selectedTx.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Today'}
                    </Text>
                  </View>

                  <View style={styles.detailsDivider} />

                  {/* Note Row */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailsRowLeft}>
                      <View style={styles.detailsIconCircle}>
                        <PencilIcon size={16} color={theme.colors.secondary} />
                      </View>
                      <Text style={styles.detailsLabel}>Note</Text>
                    </View>
                    <Text
                      style={[
                        styles.detailsValue,
                        !selectedTx.note && styles.detailsValueEmpty,
                      ]}
                      numberOfLines={2}
                    >
                      {selectedTx.note || 'No note added'}
                    </Text>
                  </View>
                </View>

                {/* CTAs */}
                <View style={styles.ctaCol}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={handleEditPress}
                    activeOpacity={0.85}
                  >
                    <PencilIcon size={18} color="#ffffff" />
                    <Text style={styles.editBtnText}>Edit Transaction</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={handleDeletePress}
                    activeOpacity={0.85}
                  >
                    <TrashIcon size={18} color={theme.colors.error} />
                    <Text style={styles.deleteBtnText}>Delete Transaction</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 2: Category Multi-Select Bottom Sheet          */}
      {/* ==================================================== */}
      <Modal
        visible={showCategorySheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategorySheet(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCategorySheet(false)}
          />
          <View
            style={[
              styles.sheetContainer,
              { maxHeight: '75%', paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.sheetHandleWrapper}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter by Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategorySheet(false)}
                style={styles.sheetCloseBtn}
              >
                <CloseIcon size={18} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Quick Category Search */}
            <View style={styles.sheetSearchWrap}>
              <SearchIcon size={18} color={theme.colors.secondary} />
              <TextInput
                style={styles.sheetSearchInput}
                placeholder="Search categories..."
                placeholderTextColor={theme.colors.secondary}
                value={categorySearch}
                onChangeText={setCategorySearch}
              />
              {categorySearch.length > 0 && (
                <TouchableOpacity onPress={() => setCategorySearch('')}>
                  <CloseIcon size={14} color={theme.colors.secondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Inset Categories List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            >
              <View style={styles.sheetCardList}>
                {categories
                  .filter((c) =>
                    c.name.toLowerCase().includes(categorySearch.toLowerCase())
                  )
                  .map((cat, idx, arr) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    const isLast = idx === arr.length - 1;

                    return (
                      <React.Fragment key={cat.id}>
                        <TouchableOpacity
                          style={styles.sheetOptionRow}
                          onPress={() => handleToggleCategory(cat.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.sheetOptionLeft}>
                            <View
                              style={[
                                styles.sheetOptionIconCircle,
                                { backgroundColor: theme.colors.primaryFixed },
                              ]}
                            >
                              <CategoryIcon
                                name={cat.name}
                                size={18}
                                color={theme.colors.primary}
                              />
                            </View>
                            <Text style={styles.sheetOptionLabel}>{cat.name}</Text>
                          </View>

                          <View
                            style={[
                              styles.checkboxCircle,
                              isSelected && styles.checkboxCircleSelected,
                            ]}
                          >
                            {isSelected && <CheckIcon size={12} color="#ffffff" />}
                          </View>
                        </TouchableOpacity>
                        {!isLast && <View style={styles.sheetOptionDivider} />}
                      </React.Fragment>
                    );
                  })}
              </View>
            </ScrollView>

            {/* Sheet Footer Actions */}
            <View style={styles.sheetFooterRow}>
              <TouchableOpacity
                style={styles.sheetResetBtn}
                onPress={() => setSelectedCategoryIds([])}
                activeOpacity={0.8}
              >
                <Text style={styles.sheetResetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetApplyBtn}
                onPress={() => setShowCategorySheet(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.sheetApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 3: Wallet Multi-Select Bottom Sheet            */}
      {/* ==================================================== */}
      <Modal
        visible={showWalletSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWalletSheet(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowWalletSheet(false)}
          />
          <View
            style={[
              styles.sheetContainer,
              { maxHeight: '75%', paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.sheetHandleWrapper}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter by Wallet</Text>
              <TouchableOpacity
                onPress={() => setShowWalletSheet(false)}
                style={styles.sheetCloseBtn}
              >
                <CloseIcon size={18} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            >
              <View style={styles.sheetCardList}>
                {wallets.map((w, idx) => {
                  const wId = w.id || w.wallet_id || '';
                  const isSelected = selectedWalletIds.includes(wId);
                  const isLast = idx === wallets.length - 1;
                  const bal = w.total_balance ?? w.balance ?? 0;

                  return (
                    <React.Fragment key={wId}>
                      <TouchableOpacity
                        style={styles.sheetOptionRow}
                        onPress={() => handleToggleWallet(wId)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.sheetOptionLeft}>
                          <View
                            style={[
                              styles.sheetOptionIconCircle,
                              { backgroundColor: theme.colors.surfaceContainerHigh },
                            ]}
                          >
                            <WalletIcon size={18} color={theme.colors.tertiary} />
                          </View>
                          <View>
                            <Text style={styles.sheetOptionLabel}>
                              {w.name || w.wallet_name || 'Wallet'}
                            </Text>
                            <Text style={styles.sheetOptionSub}>
                              {formatMoney(bal, { decimals: 0 })}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.checkboxCircle,
                            isSelected && styles.checkboxCircleSelected,
                          ]}
                        >
                          {isSelected && <CheckIcon size={12} color="#ffffff" />}
                        </View>
                      </TouchableOpacity>
                      {!isLast && <View style={styles.sheetOptionDivider} />}
                    </React.Fragment>
                  );
                })}
              </View>
            </ScrollView>

            {/* Sheet Footer Actions */}
            <View style={styles.sheetFooterRow}>
              <TouchableOpacity
                style={styles.sheetResetBtn}
                onPress={() => setSelectedWalletIds([])}
                activeOpacity={0.8}
              >
                <Text style={styles.sheetResetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetApplyBtn}
                onPress={() => setShowWalletSheet(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.sheetApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 4: Date Range Presets Bottom Sheet             */}
      {/* ==================================================== */}
      <Modal
        visible={showDateRangeSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateRangeSheet(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDateRangeSheet(false)}
          />
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.sheetHandleWrapper}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Date Range</Text>
              <TouchableOpacity
                onPress={() => setShowDateRangeSheet(false)}
                style={styles.sheetCloseBtn}
              >
                <CloseIcon size={18} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={styles.sheetCardList}>
                {(
                  [
                    { id: 'this_month', label: 'This month' },
                    { id: 'last_month', label: 'Last month' },
                    { id: 'last_3_months', label: 'Last 3 months (Default)' },
                    { id: 'this_year', label: 'This year' },
                    { id: 'custom', label: 'Custom date range...' },
                  ] as const
                ).map((opt, idx, arr) => {
                  const isSelected = datePreset === opt.id;
                  const isLast = idx === arr.length - 1;

                  return (
                    <React.Fragment key={opt.id}>
                      <TouchableOpacity
                        style={styles.sheetOptionRow}
                        onPress={() => {
                          Haptics.selectionAsync();
                          if (opt.id === 'custom') {
                            setDatePickerMode('start');
                            setShowDatePicker(true);
                          } else {
                            setDatePreset(opt.id);
                            setShowDateRangeSheet(false);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.sheetOptionLabel,
                            isSelected && { color: theme.colors.primary, fontWeight: '700' },
                          ]}
                        >
                          {opt.label}
                        </Text>

                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioInnerDot} />}
                        </View>
                      </TouchableOpacity>
                      {!isLast && <View style={styles.sheetOptionDivider} />}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* DateTimePicker for Custom Date Range */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'start' ? customStartDate : customEndDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onValueChange={handleDateValueChange}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.surfaceContainerHigh,
    zIndex: 10,
  },
  headerContent: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.margin,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    ...theme.typography.headline,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.background,
  },

  body: {
    flex: 1,
  },

  /* Fixed Filter Area above scrolling list */
  fixedFilterArea: {
    backgroundColor: theme.colors.background,
    zIndex: 5,
  },

  /* Search Bar */
  searchSection: {
    paddingHorizontal: theme.spacing.margin,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingHorizontal: 12,
    gap: 10,
    ...theme.shadows.card,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...theme.typography.body,
    fontSize: 15,
    color: theme.colors.onSurface,
  },

  /* Horizontal Filter Chips Scroller */
  chipScrollContainer: {
    paddingVertical: 8,
  },
  chipScrollContent: {
    paddingHorizontal: theme.spacing.margin,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },

  /* Shared FilterChip styles: NO shadows, NO elevation, hairline border, clipped ripple */
  chipWrapper: {
    height: CHIP_HEIGHT,
    borderRadius: CHIP_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipInner: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 4,
  },
  chipText: {
    ...theme.typography.footnote,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextBold: {
    fontWeight: '700',
  },
  chipIconLeftWrap: {
    marginRight: 2,
  },
  chipIconRightWrap: {
    marginLeft: 2,
  },
  chipDivider: {
    width: 1,
    height: 16,
    backgroundColor: theme.colors.surfaceContainerHigh,
    marginHorizontal: 2,
  },

  /* Summary Strip */
  summaryStripContainer: {
    paddingHorizontal: theme.spacing.margin,
    paddingTop: 2,
    paddingBottom: 8,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceContainerLowest,
    ...theme.shadows.card,
  },
  summaryCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  summaryCountText: {
    ...theme.typography.footnote,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  summaryTotalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summarySpentText: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  summaryDivider: {
    color: theme.colors.surfaceContainerHigh,
    fontWeight: '700',
  },
  summaryEarnedText: {
    ...theme.typography.footnote,
    fontWeight: '700',
    color: '#0E8A54',
  },
  limitBanner: {
    marginHorizontal: theme.spacing.margin,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.secondaryContainer,
  },
  limitBannerText: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    textAlign: 'center',
  },

  /* List Container */
  listContainer: {
    flex: 1,
    zIndex: 1,
  },

  /* Day Headers rendered as normal rows in list */
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: theme.colors.background,
  },
  dayHeaderTitle: {
    ...theme.typography.subheadline,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  dayHeaderNet: {
    ...theme.typography.subheadline,
    fontWeight: '600',
    color: theme.colors.secondary,
  },

  /* Transaction Row Item */
  rowWrapper: {
    backgroundColor: 'transparent',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surfaceContainerLowest,
  },
  rowFirst: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  rowLast: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...theme.shadows.card,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  rowIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: {
    flex: 1,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    ...theme.typography.headline,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
    flexShrink: 1,
  },
  adjustmentPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  adjustmentPillText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  rowSubtitle: {
    ...theme.typography.footnote,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowAmount: {
    ...theme.typography.headline,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  rowAmountIncome: {
    color: '#0E8A54',
    fontWeight: '700',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.surfaceContainer,
    marginLeft: 68,
  },

  /* Empty / No Results States */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...theme.typography.title3,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    ...theme.shadows.card,
  },
  emptyAddBtnText: {
    ...theme.typography.headline,
    fontSize: 15,
    color: '#ffffff',
  },
  clearResultsBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  clearResultsBtnText: {
    ...theme.typography.subheadline,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },

  /* Modal Bottom Sheets Common */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitle: {
    ...theme.typography.headline,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  sheetSearchInput: {
    flex: 1,
    ...theme.typography.subheadline,
    color: theme.colors.onSurface,
  },
  sheetCardList: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  sheetOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetOptionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionLabel: {
    ...theme.typography.headline,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  sheetOptionSub: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    marginTop: 1,
  },
  sheetOptionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.surfaceContainerHigh,
    marginLeft: 64,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: theme.colors.primary,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  sheetFooterRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetResetBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetResetBtnText: {
    ...theme.typography.headline,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  sheetApplyBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetApplyBtnText: {
    ...theme.typography.headline,
    fontSize: 15,
    color: '#ffffff',
  },

  /* Details Sheet Inner Details */
  detailsContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  heroCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryFixed,
    marginBottom: 8,
  },
  heroCategoryText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  heroAmountText: {
    ...theme.typography.title1,
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -0.5,
  },
  heroStatusText: {
    ...theme.typography.footnote,
    color: theme.colors.secondary,
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  detailsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsLabel: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
  },
  detailsValue: {
    ...theme.typography.headline,
    fontSize: 15,
    color: theme.colors.onSurface,
    textAlign: 'right',
    maxWidth: '50%',
  },
  detailsValueEmpty: {
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
  detailsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.surfaceContainerHigh,
    marginLeft: 58,
  },
  ctaCol: {
    gap: 10,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.card,
  },
  editBtnText: {
    ...theme.typography.headline,
    fontSize: 16,
    color: '#ffffff',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
  deleteBtnText: {
    ...theme.typography.callout,
    fontWeight: '600',
    color: theme.colors.error,
  },
});
