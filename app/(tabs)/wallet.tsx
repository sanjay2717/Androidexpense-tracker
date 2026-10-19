import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  useWalletBalances,
  useTransactions,
  useCreateWallet,
  useUpdateWallet,
  useDeleteWallet,
  useAddTransaction,
} from '../../src/lib/api';
import { WalletBalance, Transaction } from '../../src/types/database';
import { theme } from '../../src/theme';
import {
  PlusIcon,
  MinusIcon,
  CloseIcon,
  DotsVerticalIcon,
  PencilIcon,
  TrashIcon,
  CategoryIcon,
  WalletIconByType,
  BankIcon,
  CashIcon,
  CardIcon,
  WalletIcon,
  ChevronRightIcon,
} from '../../src/components/Icons';
import { NumericKeypad } from '../../src/components/NumericKeypad';
import { WalletSkeleton } from '../../src/components/Skeleton';

// Preset color options for wallets
const WALLET_COLORS = [
  { label: 'Tertiary Indigo', color: theme.colors.tertiary, gradient: ['#4c4aca', '#3b38ba', '#252285'] as const },
  { label: 'Emerald Cash', color: theme.colors.emeraldDark, gradient: ['#059669', '#047857', '#064e3b'] as const },
  { label: 'Putu Pink', color: theme.colors.primaryDark, gradient: ['#e40a65', '#b7004f', '#730d3a'] as const },
  { label: 'Royal Blue', color: theme.colors.blue, gradient: ['#3b82f6', '#2563eb', '#1d4ed8'] as const },
  { label: 'Deep Slate', color: theme.colors.slateDark, gradient: ['#334155', '#1e293b', '#0f172a'] as const },
  { label: 'Amber Gold', color: theme.colors.amber, gradient: ['#f59e0b', '#d97706', '#b45309'] as const },
];

// Preset icon options for wallets
const WALLET_ICONS = [
  { id: 'account_balance', label: 'Bank', icon: BankIcon },
  { id: 'payments', label: 'Cash', icon: CashIcon },
  { id: 'credit_card', label: 'Card', icon: CardIcon },
  { id: 'account_balance_wallet', label: 'Wallet', icon: WalletIcon },
];

function getGradientForColor(color?: string) {
  const match = WALLET_COLORS.find((c) => c.color.toLowerCase() === (color || '').toLowerCase());
  if (match) return match.gradient;
  return ['#4c4aca', '#3b38ba', '#252285'] as const;
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Screen-specific card dimensions
  const CARD_WIDTH = Math.min(width * 0.84, 340);
  const CARD_GAP = 12;

  // Data fetching
  const {
    data: wallets = [],
    isLoading: isWalletsLoading,
    isError: isWalletsError,
    refetch: refetchWallets,
  } = useWalletBalances();

  const {
    data: transactions = [],
    refetch: refetchTx,
  } = useTransactions(100);

  // Mutations
  const createWalletMutation = useCreateWallet();
  const updateWalletMutation = useUpdateWallet();
  const deleteWalletMutation = useDeleteWallet();
  const addTxMutation = useAddTransaction();

  // Active wallet index in carousel
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Selected wallet object
  const activeWallet: WalletBalance | undefined = wallets[activeIndex] || wallets[0];

  // Total balance across all wallets
  const totalBalance = useMemo(() => {
    return wallets.reduce((acc: number, w: WalletBalance) => acc + (Number(w.balance) || 0), 0);
  }, [wallets]);

  // Filtered recent activity for active wallet
  const walletTransactions = useMemo(() => {
    if (!activeWallet) return [];
    const id = activeWallet.id || (activeWallet as any).wallet_id;
    return transactions.filter((t: Transaction) => t.wallet_id === id);
  }, [transactions, activeWallet]);

  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [cardMenuVisible, setCardMenuVisible] = useState(false);
  const [moneyActionModalVisible, setMoneyActionModalVisible] = useState(false);
  const [moneyActionMode, setMoneyActionMode] = useState<'add' | 'deduct'>('add');

  // Form states for Create Wallet
  const [newName, setNewName] = useState('');
  const [newOpeningBalance, setNewOpeningBalance] = useState('');
  const [newColor, setNewColor] = useState<string>(WALLET_COLORS[0].color);
  const [newIcon, setNewIcon] = useState(WALLET_ICONS[0].id);

  // Form states for Edit Wallet
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>(WALLET_COLORS[0].color);
  const [editIcon, setEditIcon] = useState(WALLET_ICONS[0].id);

  // Form states for Add/Deduct Money
  const [amountStr, setAmountStr] = useState('0');
  const [actionNote, setActionNote] = useState('');
  const [targetWalletId, setTargetWalletId] = useState<string>('');

  // ----------------------------------------------------
  // Handlers for Carousel
  // ----------------------------------------------------
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index >= 0 && index < wallets.length && index !== activeIndex) {
      setActiveIndex(index);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // ----------------------------------------------------
  // Handlers for Create Wallet
  // ----------------------------------------------------
  const handleOpenCreateModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNewName('');
    setNewOpeningBalance('');
    setNewColor(WALLET_COLORS[0].color);
    setNewIcon(WALLET_ICONS[0].id);
    setCreateModalVisible(true);
  };

  const handleCreateWalletSubmit = async () => {
    if (!newName.trim()) {
      Alert.alert('Required', 'Please enter a name for your wallet.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const openingBal = parseFloat(newOpeningBalance) || 0;
      await createWalletMutation.mutateAsync({
        name: newName.trim(),
        opening_balance: openingBal,
        color: newColor,
        icon: newIcon,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreateModalVisible(false);
      // Snap to newest wallet
      setTimeout(() => {
        if (scrollRef.current && wallets.length > 0) {
          scrollRef.current.scrollToEnd({ animated: true });
        }
      }, 300);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create wallet. Please try again.');
    }
  };

  // ----------------------------------------------------
  // Handlers for Edit & Delete Wallet
  // ----------------------------------------------------
  const handleOpenCardMenu = () => {
    if (!activeWallet) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCardMenuVisible(true);
  };

  const handleOpenEditModal = () => {
    if (!activeWallet) return;
    setCardMenuVisible(false);
    setEditId(activeWallet.id || '');
    setEditName(activeWallet.name || '');
    setEditColor(activeWallet.color || WALLET_COLORS[0].color);
    setEditIcon(activeWallet.icon || WALLET_ICONS[0].id);
    setEditModalVisible(true);
  };

  const handleEditWalletSubmit = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter a valid wallet name.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateWalletMutation.mutateAsync({
        id: editId,
        name: editName.trim(),
        color: editColor,
        icon: editIcon,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update wallet.');
    }
  };

  const handleDeleteWallet = () => {
    if (!activeWallet || !activeWallet.id) return;
    const walletToDeleteId = activeWallet.id;
    const walletName = activeWallet.name || 'this wallet';
    setCardMenuVisible(false);

    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${walletName}"?\n\nThis will permanently delete this wallet and all of its transactions (ON DELETE CASCADE). This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await deleteWalletMutation.mutateAsync(walletToDeleteId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setActiveIndex(0);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete wallet.');
            }
          },
        },
      ]
    );
  };

  // ----------------------------------------------------
  // Handlers for Add Money & Deduct
  // ----------------------------------------------------
  const handleOpenMoneyAction = (mode: 'add' | 'deduct') => {
    if (!activeWallet) {
      Alert.alert('No Wallet Found', 'Please create a wallet before making adjustments.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMoneyActionMode(mode);
    setAmountStr('0');
    setActionNote('');
    setTargetWalletId(activeWallet.id || '');
    setMoneyActionModalVisible(true);
  };

  const handleKeypadDigit = (digit: string) => {
    setAmountStr((prev) => {
      if (digit === '.') {
        if (prev.includes('.')) return prev;
        return prev + '.';
      }
      if (prev === '0') {
        return digit;
      }
      const parts = prev.split('.');
      if (parts[1] && parts[1].length >= 2) return prev; // max 2 decimals
      if (prev.replace('.', '').length >= 9) return prev; // max 9 digits
      return prev + digit;
    });
  };

  const handleKeypadBackspace = () => {
    setAmountStr((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleMoneyActionSubmit = async () => {
    const numericAmount = parseFloat(amountStr);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than ₹0.');
      return;
    }

    if (!targetWalletId) {
      Alert.alert('Required', 'Please select a destination wallet.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const isAdd = moneyActionMode === 'add';
      const defaultNote = isAdd ? 'Added money' : 'Deducted';
      const noteToSave = actionNote.trim() ? actionNote.trim() : defaultNote;

      await addTxMutation.mutateAsync({
        wallet_id: targetWalletId,
        category_id: null,
        amount: numericAmount,
        type: isAdd ? 'income' : 'expense',
        date: new Date().toISOString().split('T')[0],
        note: noteToSave,
        is_adjustment: true,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMoneyActionModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit adjustment.');
    }
  };

  // ----------------------------------------------------
  // Render Loading / Error Skeletons
  // ----------------------------------------------------
  if (isWalletsLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <WalletSkeleton />
      </View>
    );
  }

  if (isWalletsError) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Failed to load wallets</Text>
        <Text style={styles.errorSubtitle}>Could not retrieve your wallet balances from Supabase.</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            refetchWallets();
            refetchTx();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 84, // Ensure spacing above tab bar
          },
        ]}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Wallets</Text>
            <Text style={styles.headerSubtitle}>
              Total balance:{' '}
              <Text style={styles.headerTotalBold}>
                ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addWalletHeaderBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create Wallet"
          >
            <PlusIcon size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Wallets Carousel / Empty State */}
        {wallets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <WalletIcon size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Create your first wallet</Text>
            <Text style={styles.emptySubtitle}>
              Organize your cash, bank accounts, and digital cards to track all your funds seamlessly.
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={handleOpenCreateModal}
              activeOpacity={0.85}
            >
              <PlusIcon size={18} color="#ffffff" />
              <Text style={styles.emptyCreateBtnText}>Add Wallet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.carouselSection}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {wallets.map((wallet: WalletBalance, index: number) => {
                const isActive = index === activeIndex;
                const gradientColors = getGradientForColor(wallet.color);
                const balNum = Number(wallet.balance) || 0;

                return (
                  <TouchableOpacity
                    key={wallet.id || String(index)}
                    activeOpacity={0.94}
                    onLongPress={() => {
                      setActiveIndex(index);
                      handleOpenCardMenu();
                    }}
                    onPress={() => {
                      if (!isActive) {
                        setActiveIndex(index);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        scrollRef.current?.scrollTo({
                          x: index * (CARD_WIDTH + CARD_GAP),
                          animated: true,
                        });
                      }
                    }}
                    style={[
                      styles.cardWrapper,
                      { width: CARD_WIDTH },
                      isActive ? styles.activeCardScale : styles.inactiveCardScale,
                    ]}
                  >
                    <LinearGradient
                      colors={gradientColors as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardGradient}
                    >
                      {/* Decorative Ambient Glass Rings */}
                      <View style={styles.cardGlow1} />
                      <View style={styles.cardGlow2} />

                      {/* Card Top Row */}
                      <View style={styles.cardTopRow}>
                        <View style={styles.cardIdentity}>
                          <View style={styles.cardIconBox}>
                            <WalletIconByType iconName={wallet.icon} size={20} color="#ffffff" />
                          </View>
                          <View style={styles.cardTitleBox}>
                            <Text style={styles.cardName} numberOfLines={1}>
                              {wallet.name}
                            </Text>
                            <Text style={styles.cardTagline}>
                              {index === 0 ? 'Primary' : 'Account'}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.cardMenuBtn}
                          onPress={() => {
                            setActiveIndex(index);
                            handleOpenCardMenu();
                          }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          accessibilityRole="button"
                          accessibilityLabel="Wallet options"
                        >
                          <DotsVerticalIcon size={18} color="#ffffff" />
                        </TouchableOpacity>
                      </View>

                      {/* Card Balance Bottom */}
                      <View style={styles.cardBottom}>
                        <Text style={styles.cardBalanceLabel}>AVAILABLE BALANCE</Text>
                        <View style={styles.cardBalanceRow}>
                          <Text style={styles.cardBalanceValue} numberOfLines={1}>
                            ₹{balNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <View style={styles.cardStatusChip}>
                            <View style={styles.cardStatusDot} />
                            <Text style={styles.cardStatusText}>Active</Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Pagination Dots */}
            {wallets.length > 1 && (
              <View style={styles.paginationRow}>
                {wallets.map((_: WalletBalance, i: number) => (
                  <View
                    key={i}
                    style={[
                      styles.paginationDot,
                      i === activeIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Quick Action Pill Buttons */}
        {wallets.length > 0 && (
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.addMoneyBtn}
              onPress={() => handleOpenMoneyAction('add')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Add money to wallet"
            >
              <View style={styles.actionIconWrapPrimary}>
                <PlusIcon size={18} color="#ffffff" />
              </View>
              <Text style={styles.addMoneyBtnText}>Add money</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deductBtn}
              onPress={() => handleOpenMoneyAction('deduct')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Deduct money from wallet"
            >
              <View style={styles.actionIconWrapSecondary}>
                <MinusIcon size={18} color={theme.colors.onSurface} />
              </View>
              <Text style={styles.deductBtnText}>Deduct</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Auto-Sync Quick Status Banner */}
        {wallets.length > 0 && (
          <View style={styles.syncBanner}>
            <View style={styles.syncBannerLeft}>
              <View style={styles.syncIconBox}>
                <WalletIcon size={18} color={theme.colors.tertiary} />
              </View>
              <View>
                <Text style={styles.syncTitle}>Auto-Sync Active</Text>
                <Text style={styles.syncSubtitle}>
                  {wallets.length} {wallets.length === 1 ? 'account' : 'accounts'} tracked in real-time
                </Text>
              </View>
            </View>
            <ChevronRightIcon size={18} color={theme.colors.secondary} />
          </View>
        )}

        {/* Recent Activity Section */}
        {wallets.length > 0 && (
          <View style={styles.recentActivitySection}>
            <View style={styles.recentHeaderRow}>
              <View>
                <Text style={styles.recentTitle}>Recent Activity</Text>
                {activeWallet && (
                  <Text style={styles.recentSubtitle}>
                    Filtered by <Text style={styles.recentSubtitleBold}>{activeWallet.name}</Text>
                  </Text>
                )}
              </View>
            </View>

            {walletTransactions.length === 0 ? (
              <View style={styles.emptyRecentCard}>
                <Text style={styles.emptyRecentTitle}>No activity yet</Text>
                <Text style={styles.emptyRecentDesc}>
                  Use "Add money" or "Deduct" above to record adjustments for this wallet.
                </Text>
              </View>
            ) : (
              <View style={styles.activityCard}>
                {walletTransactions.slice(0, 10).map((tx: Transaction, idx: number) => {
                  const isIncome = tx.type === 'income';
                  const isLast = idx === Math.min(walletTransactions.length, 10) - 1;
                  const displayTitle = tx.note || tx.category?.name || (isIncome ? 'Money Added' : 'Deduction');
                  const categorySubtitle = tx.category?.name ? tx.category.name : 'Wallet Adjustment';

                  return (
                    <View
                      key={tx.id || String(idx)}
                      style={[
                        styles.activityRow,
                        !isLast && styles.activityRowDivider,
                      ]}
                    >
                      <View style={styles.activityLeft}>
                        <View
                          style={[
                            styles.activityIconCircle,
                            isIncome
                              ? { backgroundColor: theme.colors.emeraldLight }
                              : { backgroundColor: theme.colors.primaryFixed },
                          ]}
                        >
                          <CategoryIcon
                            name={tx.note || tx.category?.name}
                            color={isIncome ? theme.colors.emeraldDark : theme.colors.primaryDark}
                            size={18}
                          />
                        </View>
                        <View style={styles.activityTextGroup}>
                          <View style={styles.activityTitleRow}>
                            <Text style={styles.activityTitle} numberOfLines={1}>
                              {displayTitle}
                            </Text>
                            {tx.is_adjustment ? (
                              <View style={styles.adjustmentBadge}>
                                <Text style={styles.adjustmentBadgeText}>Adjustment</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.activityMeta} numberOfLines={1}>
                            {categorySubtitle} • {tx.date ? tx.date.slice(0, 10) : 'Recent'}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.activityAmount,
                          isIncome ? styles.incomeAmountText : styles.expenseAmountText,
                        ]}
                      >
                        {isIncome ? '+' : '-'}₹
                        {Number(tx.amount).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ==================================================== */}
      {/* MODAL 1: Create Wallet Bottom Sheet                  */}
      {/* ==================================================== */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdropTap}
            activeOpacity={1}
            onPress={() => setCreateModalVisible(false)}
          />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Wallet</Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.sheetCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <CloseIcon size={18} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.inputLabel}>Wallet Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. HDFC Salary, Cash, Savings"
                placeholderTextColor={theme.colors.secondary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />

              <Text style={styles.inputLabel}>Opening Balance (₹)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                placeholderTextColor={theme.colors.secondary}
                keyboardType="decimal-pad"
                value={newOpeningBalance}
                onChangeText={setNewOpeningBalance}
              />

              <Text style={styles.inputLabel}>Color Theme</Text>
              <View style={styles.swatchesRow}>
                {WALLET_COLORS.map((col) => {
                  const isSelected = newColor.toLowerCase() === col.color.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={col.color}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: col.color },
                        isSelected && styles.colorSwatchActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNewColor(col.color);
                      }}
                      activeOpacity={0.8}
                    />
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Wallet Icon</Text>
              <View style={styles.iconsRow}>
                {WALLET_ICONS.map((item) => {
                  const isSelected = newIcon === item.id;
                  const IconComp = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.iconChip,
                        isSelected && styles.iconChipActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNewIcon(item.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <IconComp
                        size={20}
                        color={isSelected ? theme.colors.primary : theme.colors.secondary}
                      />
                      <Text
                        style={[
                          styles.iconChipText,
                          isSelected && styles.iconChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateWalletSubmit}
                disabled={createWalletMutation.isPending}
                activeOpacity={0.85}
              >
                {createWalletMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Wallet</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 2: Card Context Menu (Edit / Delete)           */}
      {/* ==================================================== */}
      <Modal
        visible={cardMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCardMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdropTap}
            activeOpacity={1}
            onPress={() => setCardMenuVisible(false)}
          />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.menuHeaderTitle}>{activeWallet?.name || 'Wallet Options'}</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleOpenEditModal}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemIconBox}>
                <PencilIcon size={18} color={theme.colors.onSurface} />
              </View>
              <Text style={styles.menuItemText}>Edit Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDestructive]}
              onPress={handleDeleteWallet}
              activeOpacity={0.7}
            >
              <View style={[styles.menuItemIconBox, { backgroundColor: theme.colors.roseLight }]}>
                <TrashIcon size={18} color={theme.colors.error} />
              </View>
              <Text style={[styles.menuItemText, { color: theme.colors.error }]}>
                Delete Wallet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCancelBtn}
              onPress={() => setCardMenuVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.menuCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 3: Edit Wallet Bottom Sheet                    */}
      {/* ==================================================== */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdropTap}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Wallet</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.sheetCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <CloseIcon size={18} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.inputLabel}>Wallet Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Wallet Name"
                placeholderTextColor={theme.colors.secondary}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.inputLabel}>Color Theme</Text>
              <View style={styles.swatchesRow}>
                {WALLET_COLORS.map((col) => {
                  const isSelected = editColor.toLowerCase() === col.color.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={col.color}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: col.color },
                        isSelected && styles.colorSwatchActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditColor(col.color);
                      }}
                      activeOpacity={0.8}
                    />
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Wallet Icon</Text>
              <View style={styles.iconsRow}>
                {WALLET_ICONS.map((item) => {
                  const isSelected = editIcon === item.id;
                  const IconComp = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.iconChip,
                        isSelected && styles.iconChipActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditIcon(item.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <IconComp
                        size={20}
                        color={isSelected ? theme.colors.primary : theme.colors.secondary}
                      />
                      <Text
                        style={[
                          styles.iconChipText,
                          isSelected && styles.iconChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleEditWalletSubmit}
                disabled={updateWalletMutation.isPending}
                activeOpacity={0.85}
              >
                {updateWalletMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 4: Add / Deduct Money Bottom Sheet             */}
      {/* ==================================================== */}
      <Modal
        visible={moneyActionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoneyActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdropTap}
            activeOpacity={1}
            onPress={() => setMoneyActionModalVisible(false)}
          />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {moneyActionMode === 'add' ? 'Add Money' : 'Deduct Money'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {moneyActionMode === 'add' ? 'Into' : 'From'}:{' '}
                  <Text style={styles.sheetSubtitleBold}>{activeWallet?.name}</Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setMoneyActionModalVisible(false)}
                style={styles.sheetCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <CloseIcon size={18} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Large Amount Display */}
            <View style={styles.amountDisplayCard}>
              <Text
                style={[
                  styles.amountDisplayText,
                  moneyActionMode === 'add' ? styles.incomeHeroColor : styles.expenseHeroColor,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {moneyActionMode === 'add' ? '+' : '-'}₹{amountStr}
              </Text>
            </View>

            {/* Optional Note Field */}
            <View style={styles.noteInputWrapper}>
              <TextInput
                style={styles.noteTextInput}
                placeholder={moneyActionMode === 'add' ? 'Note (default: Added money)' : 'Note (default: Deducted)'}
                placeholderTextColor={theme.colors.secondary}
                value={actionNote}
                onChangeText={setActionNote}
                maxLength={60}
              />
            </View>

            {/* Shared Reusable Keypad */}
            <View style={styles.keypadWrapper}>
              <NumericKeypad
                onPressDigit={handleKeypadDigit}
                onBackspace={handleKeypadBackspace}
              />
            </View>

            {/* Action Submit Button */}
            <TouchableOpacity
              style={[
                styles.actionSubmitBtn,
                moneyActionMode === 'add'
                  ? { backgroundColor: theme.colors.emeraldDark }
                  : { backgroundColor: theme.colors.primaryDark },
              ]}
              onPress={handleMoneyActionSubmit}
              disabled={addTxMutation.isPending}
              activeOpacity={0.85}
            >
              {addTxMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.actionSubmitBtnText}>
                  {moneyActionMode === 'add'
                    ? `Confirm Add ₹${amountStr}`
                    : `Confirm Deduct ₹${amountStr}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    paddingHorizontal: theme.spacing.margin,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.title1,
    color: theme.colors.onSurface,
  },
  headerSubtitle: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  headerTotalBold: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  addWalletHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glow,
  },

  /* Carousel */
  carouselSection: {
    marginBottom: 16,
  },
  carouselContent: {
    gap: 12,
    paddingVertical: 4,
  },
  cardWrapper: {
    borderRadius: theme.radii.card,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  activeCardScale: {
    transform: [{ scale: 1.0 }],
    opacity: 1,
  },
  inactiveCardScale: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
  cardGradient: {
    height: 184,
    padding: 20,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardGlow1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardGlow2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  cardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBox: {
    flex: 1,
  },
  cardName: {
    ...theme.typography.headline,
    color: '#ffffff',
    fontWeight: '700',
  },
  cardTagline: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardMenuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardBottom: {
    zIndex: 2,
  },
  cardBalanceLabel: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1,
    fontWeight: '600',
  },
  cardBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  cardBalanceValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.6,
    flex: 1,
  },
  cardStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6ee7b7',
  },
  cardStatusText: {
    ...theme.typography.caption,
    color: '#ffffff',
    fontWeight: '600',
  },

  /* Pagination Dots */
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  paginationDotActive: {
    width: 22,
    backgroundColor: theme.colors.primaryDark,
  },

  /* Quick Actions */
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  addMoneyBtn: {
    flex: 1,
    height: 50,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.glow,
  },
  addMoneyBtnText: {
    ...theme.typography.headline,
    color: '#ffffff',
    fontWeight: '600',
  },
  actionIconWrapPrimary: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deductBtn: {
    flex: 1,
    height: 50,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deductBtnText: {
    ...theme.typography.headline,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  actionIconWrapSecondary: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Sync Banner */
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: 16,
    marginBottom: 20,
    ...theme.shadows.card,
  },
  syncBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.tertiaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTitle: {
    ...theme.typography.headline,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  syncSubtitle: {
    ...theme.typography.footnote,
    color: theme.colors.secondary,
    marginTop: 2,
  },

  /* Recent Activity */
  recentActivitySection: {
    marginBottom: 16,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  recentTitle: {
    ...theme.typography.title3,
    color: theme.colors.onSurface,
  },
  recentSubtitle: {
    ...theme.typography.footnote,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  recentSubtitleBold: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  activityCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  activityRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextGroup: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityTitle: {
    ...theme.typography.headline,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  adjustmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  adjustmentBadgeText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.tertiary,
  },
  activityMeta: {
    ...theme.typography.footnote,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  activityAmount: {
    ...theme.typography.headline,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  incomeAmountText: {
    color: theme.colors.emeraldDark,
  },
  expenseAmountText: {
    color: theme.colors.primaryDark,
  },
  emptyRecentCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: 24,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  emptyRecentTitle: {
    ...theme.typography.headline,
    color: theme.colors.onSurface,
  },
  emptyRecentDesc: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: 4,
  },

  /* Empty State for No Wallets */
  emptyContainer: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: 28,
    alignItems: 'center',
    marginVertical: 16,
    ...theme.shadows.card,
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
    ...theme.typography.title2,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: theme.radii.pill,
    marginTop: 20,
    ...theme.shadows.glow,
  },
  emptyCreateBtnText: {
    ...theme.typography.headline,
    color: '#ffffff',
  },

  /* Error State */
  errorTitle: {
    ...theme.typography.title2,
    color: theme.colors.error,
  },
  errorSubtitle: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.radii.pill,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },

  /* Bottom Sheets & Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    ...theme.typography.title2,
    color: theme.colors.onSurface,
  },
  sheetSubtitle: {
    ...theme.typography.footnote,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  sheetSubtitleBold: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    ...theme.typography.callout,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radii.input,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  swatchesRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  iconsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  iconChip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFixed,
  },
  iconChipText: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
  },
  iconChipTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radii.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 12,
    ...theme.shadows.elevatedButton,
  },
  submitButtonText: {
    ...theme.typography.headline,
    color: '#ffffff',
  },

  /* Card Context Menu */
  menuHeaderTitle: {
    ...theme.typography.headline,
    textAlign: 'center',
    marginBottom: 16,
    color: theme.colors.onSurface,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerLow,
    marginBottom: 10,
  },
  menuItemDestructive: {
    backgroundColor: theme.colors.roseLight,
  },
  menuItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    ...theme.typography.headline,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  menuCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  menuCancelBtnText: {
    ...theme.typography.callout,
    color: theme.colors.secondary,
  },

  /* Add/Deduct Money Sheet Components */
  amountDisplayCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  amountDisplayText: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  incomeHeroColor: {
    color: theme.colors.emeraldDark,
  },
  expenseHeroColor: {
    color: theme.colors.primaryDark,
  },
  noteInputWrapper: {
    marginBottom: 12,
  },
  noteTextInput: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radii.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  keypadWrapper: {
    marginVertical: 4,
  },
  actionSubmitBtn: {
    height: 52,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  actionSubmitBtnText: {
    ...theme.typography.headline,
    color: '#ffffff',
    fontWeight: '700',
  },
});
