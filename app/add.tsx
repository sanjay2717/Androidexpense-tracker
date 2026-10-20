import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

import { theme } from '../src/theme';
import { safeBack } from '../src/lib/nav';
import {
  fetchCategories,
  fetchWalletBalances,
  useAddTransaction,
} from '../src/lib/api';
import { Category, WalletBalance, TransactionType } from '../src/types/database';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  ChevronRightIcon,
  CategoryIcon,
  WalletIcon,
} from '../src/components/Icons';
import { NumericKeypad } from '../src/components/NumericKeypad';

const LAST_USED_WALLET_KEY = '@putu_last_wallet_id';
const LAST_USED_CAT_EXPENSE_KEY = '@putu_last_cat_expense';
const LAST_USED_CAT_INCOME_KEY = '@putu_last_cat_income';

export default function AddTransactionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  // State
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Categories & Wallets
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [showWalletPicker, setShowWalletPicker] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Feedback & UI State
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Mutation
  const addTxMutation = useAddTransaction();

  // Animations
  const sheetTranslateY = useSharedValue(600);
  const sheetOpacity = useSharedValue(0);
  const amountScale = useSharedValue(1);
  const typeIndicatorPos = useSharedValue(0); // 0 = Expense, 1 = Income
  const successScale = useSharedValue(0.5);
  const successOpacity = useSharedValue(0);

  // Initial Entrance Animation
  useEffect(() => {
    sheetTranslateY.set(withSpring(0, { duration: 380, dampingRatio: 0.82 }));
    sheetOpacity.set(withTiming(1, { duration: 250 }));
  }, []);

  // Fetch Wallets & Categories & Restore Last Used
  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoadingData(true);
        const [cats, wals] = await Promise.all([
          fetchCategories(),
          fetchWalletBalances(),
        ]);

        setCategories(cats);
        setWallets(wals);

        // Restore last wallet or default to first
        const savedWalletId = await AsyncStorage.getItem(LAST_USED_WALLET_KEY);
        if (savedWalletId && wals.some((w) => (w.id || w.wallet_id) === savedWalletId)) {
          setSelectedWalletId(savedWalletId);
        } else if (wals.length > 0) {
          const firstId = wals[0].id || wals[0].wallet_id || null;
          setSelectedWalletId(firstId);
        }

        // Restore last category for current type
        const catKey = type === 'expense' ? LAST_USED_CAT_EXPENSE_KEY : LAST_USED_CAT_INCOME_KEY;
        const savedCatId = await AsyncStorage.getItem(catKey);
        const matchingCats = cats.filter((c) => (c.type || 'expense') === type);

        if (savedCatId && matchingCats.some((c) => c.id === savedCatId)) {
          setSelectedCategoryId(savedCatId);
        } else if (matchingCats.length > 0) {
          setSelectedCategoryId(matchingCats[0].id);
        }
      } catch (err) {
        console.warn('Error loading initial data in Add screen:', err);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, []);

  // Switch type and re-select appropriate category
  const handleSwitchType = (newType: TransactionType) => {
    if (newType === type) return;
    Haptics.selectionAsync();
    setType(newType);
    typeIndicatorPos.set(withSpring(newType === 'expense' ? 0 : 1, { duration: 260, dampingRatio: 0.85 }));

    const catKey = newType === 'expense' ? LAST_USED_CAT_EXPENSE_KEY : LAST_USED_CAT_INCOME_KEY;
    AsyncStorage.getItem(catKey).then((savedCatId) => {
      const filtered = categories.filter((c) => (c.type || 'expense') === newType);
      if (savedCatId && filtered.some((c) => c.id === savedCatId)) {
        setSelectedCategoryId(savedCatId);
      } else if (filtered.length > 0) {
        setSelectedCategoryId(filtered[0].id);
      } else {
        setSelectedCategoryId(null);
      }
    });
  };

  // Animate amount digits subtly on change
  const triggerAmountPulse = () => {
    amountScale.set(
      withSequence(
        withTiming(1.08, { duration: 60 }),
        withSpring(1, { duration: 180, dampingRatio: 0.7 })
      )
    );
  };

  // Keypad Handlers
  const handlePressDigit = (char: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInlineError(null);

    setAmountStr((prev) => {
      if (char === '.') {
        if (prev.includes('.')) return prev;
        triggerAmountPulse();
        return prev + '.';
      }

      // Max 9 digits overall (excluding decimal dot)
      const digitsOnly = prev.replace('.', '');
      if (digitsOnly.length >= 9) return prev;

      // Max 2 decimals
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1] && parts[1].length >= 2) return prev;
      }

      triggerAmountPulse();
      if (prev === '0') return char;
      return prev + char;
    });
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInlineError(null);

    setAmountStr((prev) => {
      if (prev.length <= 1) {
        triggerAmountPulse();
        return '0';
      }
      triggerAmountPulse();
      return prev.slice(0, -1);
    });
  };

  const handleSelectCategory = (catId: string) => {
    Haptics.selectionAsync();
    setSelectedCategoryId(catId);
    const catKey = type === 'expense' ? LAST_USED_CAT_EXPENSE_KEY : LAST_USED_CAT_INCOME_KEY;
    AsyncStorage.setItem(catKey, catId).catch(() => {});
  };

  const handleSelectWallet = (wId: string) => {
    Haptics.selectionAsync();
    setSelectedWalletId(wId);
    AsyncStorage.setItem(LAST_USED_WALLET_KEY, wId).catch(() => {});
    setShowWalletPicker(false);
  };

  // Date change handler
  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // Dismiss sheet with spring
  const handleDismiss = () => {
    sheetTranslateY.set(
      withTiming(700, { duration: 250 }, () => {
        runOnJS(safeBack)('/(tabs)');
      })
    );
    sheetOpacity.set(withTiming(0, { duration: 200 }));
  };

  const handleGoToWallets = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sheetTranslateY.set(
      withTiming(700, { duration: 250 }, () => {
        runOnJS(router.replace)('/(tabs)/wallet');
      })
    );
    sheetOpacity.set(withTiming(0, { duration: 200 }));
  };

  // Validation
  const numericAmount = parseFloat(amountStr) || 0;
  const isFormValid = numericAmount > 0 && !!selectedCategoryId && !!selectedWalletId;

  // Selected entities memoized to avoid re-searching on every digit press
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );
  const selectedWallet = useMemo(
    () => wallets.find((w) => (w.id || w.wallet_id) === selectedWalletId),
    [wallets, selectedWalletId]
  );
  const filteredCategories = useMemo(
    () => categories.filter((c) => (c.type || 'expense') === type),
    [categories, type]
  );

  // Save Transaction
  const handleSave = async () => {
    if (!isFormValid || addTxMutation.isPending) return;

    setInlineError(null);
    try {
      const formattedDate = date.toISOString().split('T')[0];

      await addTxMutation.mutateAsync({
        wallet_id: selectedWalletId!,
        category_id: selectedCategoryId || undefined,
        amount: numericAmount,
        type,
        date: formattedDate,
        note: note.trim() || undefined,
        category: selectedCategory || null,
        wallet: selectedWallet || null,
      });

      // Success feedback & animation
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);
      successOpacity.set(withTiming(1, { duration: 150 }));
      successScale.set(withSpring(1, { duration: 320, dampingRatio: 0.65 }));

      // Auto dismiss after brief success display
      setTimeout(() => {
        handleDismiss();
      }, 700);
    } catch (err: any) {
      console.warn('Transaction save failed:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setInlineError(err.message || 'Failed to record transaction. Please try again.');
    }
  };

  // Animated Styles
  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.get() }],
    opacity: sheetOpacity.get(),
  }));

  const animatedAmountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: amountScale.get() }],
  }));

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    // 50% width indicator inside a 2-segment container
    return {
      left: typeIndicatorPos.get() === 0 ? '2%' : '51%',
    };
  });

  const animatedSuccessStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.get() }],
    opacity: successOpacity.get(),
  }));

  const formatDateDisplay = (d: Date) => {
    const today = new Date();
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.backdrop}>
      {/* Tap backdrop to dismiss */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleDismiss}
      />

      {/* Main Sheet Container */}
      <Animated.View
        style={[
          styles.sheetContainer,
          { paddingBottom: Math.max(insets.bottom, 16) },
          animatedSheetStyle,
        ]}
      >
        {/* Grab Handle */}
        <View style={styles.handleWrapper}>
          <View style={styles.handleBar} />
        </View>

        {/* Header Bar */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Add Transaction</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {!isLoadingData && wallets.length === 0 ? (
          <View style={styles.emptyWalletContainer}>
            <View style={styles.emptyWalletIconCircle}>
              <WalletIcon size={36} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.emptyWalletTitle}>No Wallets Found</Text>
            <Text style={styles.emptyWalletSubtitle}>
              You need at least one wallet to record transactions. Create a wallet first to start tracking your finances.
            </Text>
            <TouchableOpacity
              style={styles.goToWalletsBtn}
              onPress={handleGoToWallets}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Go to Wallets"
            >
              <Text style={styles.goToWalletsBtnText}>Go to Wallets</Text>
              <ChevronRightIcon size={18} color={theme.colors.surfaceContainerLowest} />
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          {/* Segmented Type Control */}
          <View style={styles.segmentedContainer}>
            <Animated.View style={[styles.segmentedIndicator, animatedIndicatorStyle]} />
            <TouchableOpacity
              style={styles.segmentedTab}
              onPress={() => handleSwitchType('expense')}
              activeOpacity={0.8}
            >
              <ArrowDownIcon
                size={16}
                color={type === 'expense' ? theme.colors.primary : theme.colors.secondary}
              />
              <Text
                style={[
                  styles.segmentedTabText,
                  type === 'expense' && styles.segmentedTabTextActive,
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.segmentedTab}
              onPress={() => handleSwitchType('income')}
              activeOpacity={0.8}
            >
              <ArrowUpIcon
                size={16}
                color={type === 'income' ? theme.colors.emeraldDark : theme.colors.secondary}
              />
              <Text
                style={[
                  styles.segmentedTabText,
                  type === 'income' && styles.segmentedTabTextActive,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Display Hero */}
          <View style={styles.amountHero}>
            <View style={styles.amountDisplayRow}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <Animated.Text
                style={[styles.amountValueText, animatedAmountStyle]}
                numberOfLines={1}
              >
                {amountStr}
              </Animated.Text>
              <View style={styles.blinkingCursor} />
            </View>
            <Text style={styles.outflowSubtitle}>
              {type === 'expense' ? 'Outflow' : 'Inflow'}
            </Text>
          </View>

          {/* Inline Error Notice */}
          {inlineError && (
            <View style={styles.errorNoticeBox}>
              <Text style={styles.errorNoticeText}>{inlineError}</Text>
            </View>
          )}

          {/* Category Chips Scroller */}
          <View style={styles.categoriesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
            >
              {filteredCategories.map((cat: Category) => {
                const isSelected = cat.id === selectedCategoryId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    onPress={() => handleSelectCategory(cat.id)}
                    activeOpacity={0.85}
                  >
                    <CategoryIcon
                      name={cat.name}
                      size={18}
                      color={isSelected ? theme.colors.surfaceContainerLowest : theme.colors.secondary}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Inset Grouped Details Card */}
          <View style={styles.groupedCard}>
            {/* 1. Wallet Row */}
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => {
                Haptics.selectionAsync();
                setShowWalletPicker(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.groupedRowLeft}>
                <View style={styles.rowIconCircle}>
                  <WalletIcon size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.groupedRowLabel}>Wallet</Text>
              </View>
              <View style={styles.groupedRowRight}>
                <Text style={styles.groupedRowValue}>
                  {selectedWallet?.name || selectedWallet?.wallet_name || 'Select Wallet'}
                </Text>
                <ChevronRightIcon size={16} color={theme.colors.secondary} />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* 2. Date Row */}
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => {
                Haptics.selectionAsync();
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.groupedRowLeft}>
                <View style={styles.rowIconCircle}>
                  <CalendarIcon size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.groupedRowLabel}>Date</Text>
              </View>
              <View style={styles.groupedRowRight}>
                <Text style={styles.groupedRowValue}>{formatDateDisplay(date)}</Text>
                <ChevronRightIcon size={16} color={theme.colors.secondary} />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* 3. Note Row */}
            <View style={styles.groupedRow}>
              <View style={styles.groupedRowLeft}>
                <View style={styles.rowIconCircle}>
                  <Text style={styles.notePencilIcon}>✎</Text>
                </View>
                <Text style={styles.groupedRowLabel}>Note</Text>
              </View>
              <View style={styles.groupedRowInputRight}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Add a note..."
                  placeholderTextColor={theme.colors.secondary}
                  value={note}
                  onChangeText={setNote}
                  maxLength={60}
                />
              </View>
            </View>
          </View>

          {/* Date Picker (iOS Modal or Android Native) */}
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* On-Screen Numeric Keypad (3x4) */}
          <View style={{ marginBottom: 16 }}>
            <NumericKeypad
              onPressDigit={handlePressDigit}
              onBackspace={handleBackspace}
            />
          </View>

          {/* Primary Save Action Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              !isFormValid && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!isFormValid || addTxMutation.isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.saveCheckIcon}>✓</Text>
            <Text style={styles.saveButtonText}>
              {addTxMutation.isPending
                ? 'Recording...'
                : `Save ${type === 'expense' ? 'Expense' : 'Income'}`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        )}

        {/* Success Overlay Animation */}
        {showSuccess && (
          <View style={styles.successOverlay}>
            <Animated.View style={[styles.successCard, animatedSuccessStyle]}>
              <View style={styles.successIconCircle}>
                <Text style={styles.successCheckSymbol}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Transaction Recorded</Text>
              <Text style={styles.successAmount}>
                ₹{numericAmount.toLocaleString('en-IN')}
              </Text>
            </Animated.View>
          </View>
        )}

        {/* Wallet Picker Modal Sheet */}
        <Modal
          visible={showWalletPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWalletPicker(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setShowWalletPicker(false)}
            />
            <View style={styles.walletPickerSheet}>
              <View style={styles.walletPickerHeader}>
                <Text style={styles.walletPickerTitle}>Select Wallet</Text>
                <TouchableOpacity
                  onPress={() => setShowWalletPicker(false)}
                  style={styles.pickerCloseBtn}
                >
                  <Text style={styles.pickerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.walletList}>
                {wallets.length === 0 ? (
                  <View style={styles.emptyWalletNotice}>
                    <Text style={styles.emptyWalletNoticeTitle}>Create your first wallet</Text>
                    <Text style={styles.emptyWalletNoticeSubtitle}>
                      No wallets found in Supabase. Please add a wallet in your database to select it here.
                    </Text>
                  </View>
                ) : (
                  wallets.map((w) => {
                    const wId = w.id || w.wallet_id || '';
                    const isSelected = wId === selectedWalletId;
                    const balance = w.total_balance ?? w.balance ?? 0;

                    return (
                      <TouchableOpacity
                        key={wId}
                        style={[
                          styles.walletOptionRow,
                          isSelected && styles.walletOptionRowSelected,
                        ]}
                        onPress={() => handleSelectWallet(wId)}
                      >
                        <View style={styles.walletOptionLeft}>
                          <View style={styles.walletDot} />
                          <View>
                            <Text style={styles.walletOptionName}>
                              {w.name || w.wallet_name || 'Wallet'}
                            </Text>
                            <Text style={styles.walletOptionBalance}>
                              Balance: ₹{Number(balance).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Text style={styles.walletCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: theme.colors.outlineVariant,
  },
  headerRow: {
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  segmentedContainer: {
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 14,
    height: 44,
    padding: 3,
    marginTop: 6,
    marginBottom: 16,
  },
  segmentedIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '47%',
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 11,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  segmentedTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.secondary,
  },
  segmentedTabTextActive: {
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  amountHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.secondary,
    marginRight: 4,
  },
  amountValueText: {
    fontSize: 42,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -1,
  },
  blinkingCursor: {
    width: 2.5,
    height: 32,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginLeft: 6,
    alignSelf: 'center',
  },
  outflowSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  errorNoticeBox: {
    backgroundColor: theme.colors.roseLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryFixed,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorNoticeText: {
    fontSize: 13,
    color: theme.colors.primaryDark,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoriesSection: {
    marginVertical: 10,
  },
  categoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  groupedCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 6,
    marginTop: 10,
    marginBottom: 16,
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  groupedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notePencilIcon: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  groupedRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  groupedRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupedRowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
  groupedRowInputRight: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  noteInput: {
    width: '100%',
    textAlign: 'right',
    fontSize: 14,
    color: theme.colors.onSurface,
    paddingVertical: 0,
  },
  rowDivider: {
    height: 4,
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    marginBottom: 16,
  },
  keypadButton: {
    width: '31.5%',
    height: 48,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadDigit: {
    fontSize: 21,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  backspaceIcon: {
    fontSize: 20,
    color: theme.colors.secondary,
  },
  saveButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveCheckIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.surfaceContainerLowest,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.surfaceContainerLowest,
    letterSpacing: -0.1,
  },
  successOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  successCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.roseLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successCheckSymbol: {
    fontSize: 28,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  successAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  walletPickerSheet: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  walletPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.hairline,
  },
  walletPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCloseText: {
    fontSize: 13,
    color: theme.colors.secondary,
  },
  walletList: {
    marginTop: 12,
  },
  walletOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  walletOptionRowSelected: {
    backgroundColor: theme.colors.roseLight,
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  walletOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  walletOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  walletOptionBalance: {
    fontSize: 13,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  walletCheckmark: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  emptyWalletNotice: {
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  emptyWalletNoticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 6,
  },
  emptyWalletNoticeSubtitle: {
    fontSize: 13,
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyWalletContainer: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWalletIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyWalletTitle: {
    ...theme.typography.title2,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyWalletSubtitle: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  goToWalletsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: theme.radii.pill,
    ...theme.shadows.glow,
  },
  goToWalletsBtnText: {
    ...theme.typography.headline,
    color: '#ffffff',
    fontWeight: '700',
  },
});
