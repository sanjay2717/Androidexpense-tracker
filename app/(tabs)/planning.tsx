import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  useCategories,
  useUpdateCategoryBudget,
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useTransactions,
} from '../../src/lib/api';
import { Category, Goal, Transaction } from '../../src/types/database';
import { theme } from '../../src/theme';
import {
  PlusIcon,
  CloseIcon,
  PencilIcon,
  TrashIcon,
  CategoryIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  FlagIcon,
  TrophyIcon,
  SparklesIcon,
  TrendingUpIcon,
  WalletIcon,
  ShieldCheckIcon,
} from '../../src/components/Icons';
import { NumericKeypad } from '../../src/components/NumericKeypad';
import { PlanningSkeleton } from '../../src/components/Skeleton';

// Color choices for goals (strictly curated from theme tokens & harmony)
const GOAL_COLORS = [
  { label: 'Putu Pink', color: theme.colors.primary },
  { label: 'Emerald Green', color: theme.colors.emeraldDark },
  { label: 'Tertiary Indigo', color: theme.colors.tertiary },
  { label: 'Amber Gold', color: theme.colors.amber },
  { label: 'Rose Accent', color: theme.colors.rose },
  { label: 'Deep Slate', color: theme.colors.slate },
];

// Icon choices for goals
const GOAL_ICONS = [
  { id: 'flag', label: 'Flag', Component: FlagIcon },
  { id: 'trophy', label: 'Trophy', Component: TrophyIcon },
  { id: 'shield', label: 'Shield', Component: ShieldCheckIcon },
  { id: 'sparkles', label: 'Sparkles', Component: SparklesIcon },
  { id: 'calendar', label: 'Calendar', Component: CalendarIcon },
  { id: 'wallet', label: 'Savings', Component: WalletIcon },
];

function getGoalIconComponent(iconId?: string) {
  const match = GOAL_ICONS.find((item) => item.id === iconId);
  return match ? match.Component : FlagIcon;
}

function formatCurrency(val: number) {
  return Number(val || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Tab State: 'budgets' | 'goals'
  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>('budgets');
  const tabTranslateX = useSharedValue(0);

  // Data queries
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useCategories();

  const {
    data: goals = [],
    isLoading: isGoalsLoading,
    isError: isGoalsError,
    refetch: refetchGoals,
  } = useGoals();

  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    refetch: refetchTransactions,
  } = useTransactions(150);

  // Mutations
  const updateBudgetMutation = useUpdateCategoryBudget();
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  // Modal Sheet States
  const [budgetSheetVisible, setBudgetSheetVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  const [depositSheetVisible, setDepositSheetVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [depositInput, setDepositInput] = useState('');

  const [goalFormVisible, setGoalFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalColor, setGoalColor] = useState<string>(theme.colors.emeraldDark);
  const [goalIcon, setGoalIcon] = useState('flag');

  // Celebration Modal State
  const [celebrationGoal, setCelebrationGoal] = useState<Goal | null>(null);
  const celebrationScale = useSharedValue(0.5);
  const celebrationOpacity = useSharedValue(0);

  // Tab Switch handler with animated pill
  const handleTabSwitch = (tab: 'budgets' | 'goals') => {
    if (tab === activeTab) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    tabTranslateX.value = withSpring(tab === 'budgets' ? 0 : 1, {
      damping: 18,
      stiffness: 180,
    });
  };

  // Animated Pill Indicator Style
  // Container width inside padding: width - (margin * 2) - 6 (track padding)
  const trackInnerWidth = width - theme.spacing.margin * 2 - 6;
  const pillWidth = trackInnerWidth / 2;

  const pillAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: tabTranslateX.value * pillWidth,
        },
      ],
    };
  });

  // Calculate this month's spending by category (excluding is_adjustment = true)
  const { currentMonthSpentByCat, totalMonthSpent, daysRemaining } = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const daysLeft = Math.max(1, daysInMonth - now.getDate());

    const spentMap: Record<string, number> = {};
    let total = 0;

    transactions.forEach((tx: Transaction) => {
      // Exclude adjustment rows
      if (tx.is_adjustment) return;
      if (tx.type !== 'expense') return;

      const txDate = new Date(tx.date || tx.created_at || '');
      if (
        !isNaN(txDate.getTime()) &&
        txDate.getFullYear() === curYear &&
        txDate.getMonth() === curMonth
      ) {
        const catId = tx.category_id || tx.category?.id;
        if (catId) {
          spentMap[catId] = (spentMap[catId] || 0) + Number(tx.amount || 0);
        }
        total += Number(tx.amount || 0);
      }
    });

    return {
      currentMonthSpentByCat: spentMap,
      totalMonthSpent: total,
      daysRemaining: daysLeft,
    };
  }, [transactions]);

  // Filter expense categories
  const expenseCategories = useMemo(() => {
    return categories.filter((c: Category) => c.type !== 'income');
  }, [categories]);

  // Sum of all category budget limits
  const totalBudgetLimit = useMemo(() => {
    return expenseCategories.reduce((sum, c) => {
      const limit = Number(c.budget_limit) || 0;
      return sum + limit;
    }, 0);
  }, [expenseCategories]);

  // Overall budget utilization
  const budgetUtilizationRatio = totalBudgetLimit > 0 ? totalMonthSpent / totalBudgetLimit : 0;
  const budgetUtilizationPct = Math.round(budgetUtilizationRatio * 100);
  const budgetRemaining = Math.max(0, totalBudgetLimit - totalMonthSpent);

  // Goals metrics
  const totalGoalsAccumulated = useMemo(() => {
    return goals.reduce((sum, g) => sum + (Number(g.saved_amount) || 0), 0);
  }, [goals]);

  // Trigger celebration
  const triggerCelebration = (goal: Goal) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCelebrationGoal(goal);
    celebrationOpacity.value = withTiming(1, { duration: 300 });
    celebrationScale.value = withSequence(
      withTiming(1.15, { duration: 300, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 })
    );
  };

  const closeCelebration = () => {
    celebrationOpacity.value = withTiming(0, { duration: 200 });
    celebrationScale.value = withTiming(0.8, { duration: 200 });
    setTimeout(() => {
      setCelebrationGoal(null);
    }, 220);
  };

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: celebrationOpacity.value,
    transform: [{ scale: celebrationScale.value }],
  }));

  // Open Category Budget Sheet
  const handleOpenBudgetSheet = (cat: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(cat);
    setBudgetInput(cat.budget_limit ? String(cat.budget_limit) : '');
    setBudgetSheetVisible(true);
  };

  // Keypad actions for Budget
  const handleBudgetDigit = (digit: string) => {
    if (digit === '.') return; // Budgets in round currency
    if (budgetInput.length >= 7) return; // Cap at 9,999,999
    if (budgetInput === '0') {
      setBudgetInput(digit);
    } else {
      setBudgetInput((prev) => prev + digit);
    }
  };

  const handleBudgetBackspace = () => {
    setBudgetInput((prev) => prev.slice(0, -1));
  };

  const handleSaveBudget = async () => {
    if (!selectedCategory) return;
    const limitVal = budgetInput.trim() ? Number(budgetInput) : null;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateBudgetMutation.mutateAsync({
        categoryId: selectedCategory.id,
        budgetLimit: limitVal,
      });
      setBudgetSheetVisible(false);
      setSelectedCategory(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save budget');
    }
  };

  const handleClearBudget = async () => {
    if (!selectedCategory) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateBudgetMutation.mutateAsync({
        categoryId: selectedCategory.id,
        budgetLimit: null,
      });
      setBudgetSheetVisible(false);
      setSelectedCategory(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not clear budget');
    }
  };

  // Open Goal Deposit Sheet
  const handleOpenDepositSheet = (goal: Goal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGoal(goal);
    setDepositInput('');
    setDepositSheetVisible(true);
  };

  const handleDepositDigit = (digit: string) => {
    if (digit === '.') return;
    if (depositInput.length >= 7) return;
    if (depositInput === '0') {
      setDepositInput(digit);
    } else {
      setDepositInput((prev) => prev + digit);
    }
  };

  const handleDepositBackspace = () => {
    setDepositInput((prev) => prev.slice(0, -1));
  };

  const handleConfirmDeposit = async () => {
    if (!selectedGoal) return;
    const depositAmt = Number(depositInput) || 0;
    if (depositAmt <= 0) {
      Alert.alert('Invalid amount', 'Please enter an amount to deposit.');
      return;
    }

    const currentSaved = Number(selectedGoal.saved_amount) || 0;
    const targetAmt = Number(selectedGoal.target_amount) || 1;
    const newSaved = currentSaved + depositAmt;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateGoalMutation.mutateAsync({
        id: selectedGoal.id,
        saved_amount: newSaved,
      });

      setDepositSheetVisible(false);

      // Check if newly reached or exceeded 100%
      if (currentSaved < targetAmt && newSaved >= targetAmt) {
        triggerCelebration({
          ...selectedGoal,
          saved_amount: newSaved,
        });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setSelectedGoal(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add deposit to goal');
    }
  };

  // Open Create/Edit Goal Sheet
  const handleOpenCreateGoal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingGoal(null);
    setGoalName('');
    setGoalTargetAmount('');
    setGoalTargetDate('');
    setGoalColor(theme.colors.emeraldDark);
    setGoalIcon('flag');
    setGoalFormVisible(true);
  };

  const handleOpenEditGoal = (goal: Goal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalTargetAmount(String(goal.target_amount));
    setGoalTargetDate(goal.target_date || '');
    setGoalColor(goal.color || theme.colors.emeraldDark);
    setGoalIcon(goal.icon || 'flag');
    setGoalFormVisible(true);
  };

  const handleDeleteGoal = (goal: Goal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await deleteGoalMutation.mutateAsync(goal.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete goal');
            }
          },
        },
      ]
    );
  };

  const handleSaveGoalForm = async () => {
    if (!goalName.trim()) {
      Alert.alert('Required', 'Please enter a goal name.');
      return;
    }
    const target = Number(goalTargetAmount);
    if (isNaN(target) || target <= 0) {
      Alert.alert('Required', 'Please enter a valid target amount.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (editingGoal) {
        await updateGoalMutation.mutateAsync({
          id: editingGoal.id,
          name: goalName.trim(),
          target_amount: target,
          target_date: goalTargetDate.trim() || null,
          color: goalColor,
          icon: goalIcon,
        });
      } else {
        await createGoalMutation.mutateAsync({
          name: goalName.trim(),
          target_amount: target,
          saved_amount: 0,
          target_date: goalTargetDate.trim() || null,
          color: goalColor,
          icon: goalIcon,
        });
      }
      setGoalFormVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save goal');
    }
  };

  // Loading skeleton
  const isLoading = (isCategoriesLoading || isGoalsLoading || isTransactionsLoading) && categories.length === 0;

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Planning</Text>
        </View>
        <PlanningSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>FINANCIAL HORIZON</Text>
          <Text style={styles.headerTitle}>Planning</Text>
        </View>
        {activeTab === 'budgets' ? (
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              // Open sheet for first category that has no budget limit, or the first category
              const targetCat = expenseCategories.find((c) => !c.budget_limit) || expenseCategories[0];
              if (targetCat) {
                handleOpenBudgetSheet(targetCat);
              }
            }}
            activeOpacity={0.8}
          >
            <PlusIcon size={16} color={theme.colors.surfaceContainerLowest} />
            <Text style={styles.quickActionText}>Set Budget</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: theme.colors.emeraldDark }]}
            onPress={handleOpenCreateGoal}
            activeOpacity={0.8}
          >
            <PlusIcon size={16} color={theme.colors.surfaceContainerLowest} />
            <Text style={styles.quickActionText}>New Goal</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Control Track */}
      <View style={styles.segmentedContainer}>
        <View style={styles.segmentTrack}>
          {/* Animated White Pill Indicator */}
          <Animated.View
            style={[
              styles.segmentIndicator,
              { width: pillWidth },
              pillAnimatedStyle,
            ]}
          />
          {/* Budgets Tab Button */}
          <TouchableOpacity
            style={styles.segmentButton}
            onPress={() => handleTabSwitch('budgets')}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'budgets' }}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'budgets'
                  ? { color: theme.colors.primaryDark, fontWeight: '700' }
                  : { color: theme.colors.secondary, fontWeight: '500' },
              ]}
            >
              Budgets
            </Text>
          </TouchableOpacity>

          {/* Goals Tab Button */}
          <TouchableOpacity
            style={styles.segmentButton}
            onPress={() => handleTabSwitch('goals')}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'goals' }}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === 'goals'
                  ? { color: theme.colors.emeraldDark, fontWeight: '700' }
                  : { color: theme.colors.secondary, fontWeight: '500' },
              ]}
            >
              Goals
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'budgets' ? (
          /* ========================================================= */
          /* 1. BUDGETS VIEW                                           */
          /* ========================================================= */
          <View style={styles.viewContent}>
            {/* Monthly Budget Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View>
                  <Text style={styles.summarySubtitle}>Monthly Budget</Text>
                  <Text style={styles.summaryValue}>
                    ₹{formatCurrency(totalBudgetLimit)}
                  </Text>
                </View>
                <View style={styles.daysBadge}>
                  <CalendarIcon size={14} color={theme.colors.primaryDark} />
                  <Text style={styles.daysBadgeText}>{daysRemaining}d left</Text>
                </View>
              </View>

              {/* Overall Progress Bar */}
              {totalBudgetLimit > 0 ? (
                <View style={styles.progressSection}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, budgetUtilizationPct))}%`,
                          backgroundColor:
                            budgetUtilizationRatio > 1
                              ? theme.colors.error
                              : budgetUtilizationRatio >= 0.8
                              ? theme.colors.warning
                              : theme.colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabels}>
                    <Text
                      style={[
                        styles.progressPercent,
                        budgetUtilizationRatio > 1 && { color: theme.colors.error, fontWeight: '700' },
                      ]}
                    >
                      {budgetUtilizationPct}% utilized
                    </Text>
                    <Text style={styles.progressAvailable}>
                      {totalMonthSpent <= totalBudgetLimit
                        ? `₹${formatCurrency(budgetRemaining)} available`
                        : `₹${formatCurrency(totalMonthSpent - totalBudgetLimit)} over limit`}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Two Inset Metric Chips */}
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIconCircle}>
                    <TrendingUpIcon size={18} color={theme.colors.primaryDark} />
                  </View>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Spent so far</Text>
                    <Text style={styles.metricValue}>₹{formatCurrency(totalMonthSpent)}</Text>
                  </View>
                </View>
                <View style={styles.metricCard}>
                  <View style={[styles.metricIconCircle, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                    <WalletIcon size={18} color={theme.colors.tertiary} />
                  </View>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Remaining</Text>
                    <Text style={styles.metricValue}>₹{formatCurrency(budgetRemaining)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Empty State when no category limits are set */}
            {totalBudgetLimit === 0 ? (
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyIconCircle}>
                  <CalendarIcon size={32} color={theme.colors.primary} />
                </View>
                <Text style={styles.emptyStateTitle}>Set your first budget</Text>
                <Text style={styles.emptyStateDesc}>
                  Select any category below to assign a monthly spending limit and monitor your daily cash flow.
                </Text>
              </View>
            ) : null}

            {/* Category Budgets Inset Group */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Category Budgets</Text>
              <Text style={styles.sectionSubtitle}>Tap row to edit limit</Text>
            </View>

            <View style={styles.categoryCardGroup}>
              {expenseCategories.map((cat: Category, index: number) => {
                const spent = currentMonthSpentByCat[cat.id] || 0;
                const limit = Number(cat.budget_limit) || null;
                const hasLimit = limit !== null && limit > 0;
                const ratio = hasLimit ? spent / limit : 0;
                const percent = hasLimit ? Math.round(ratio * 100) : 0;
                const isOver = hasLimit && spent > limit;
                const isNear = hasLimit && ratio >= 0.8 && !isOver;

                // Color for progress bar
                let barColor: string = theme.colors.primary;
                if (isOver) {
                  barColor = theme.colors.error;
                } else if (isNear) {
                  barColor = theme.colors.warning; // orange at 80%
                }

                return (
                  <View key={cat.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <TouchableOpacity
                      style={styles.categoryRow}
                      onPress={() => handleOpenBudgetSheet(cat)}
                      activeOpacity={0.7}
                    >
                      {/* Category Icon */}
                      <View
                        style={[
                          styles.catIconWrap,
                          { backgroundColor: cat.color ? cat.color + '18' : theme.colors.primaryFixed },
                        ]}
                      >
                        <CategoryIcon name={cat.name} color={cat.color || theme.colors.primary} size={20} />
                      </View>

                      {/* Info & Progress */}
                      <View style={styles.catInfoCol}>
                        <View style={styles.catTitleRow}>
                          <View style={styles.catNameContainer}>
                            <Text style={styles.catName} numberOfLines={1}>
                              {cat.name}
                            </Text>
                            {isOver ? (
                              <View style={styles.overBadge}>
                                <Text style={styles.overBadgeText}>
                                  ₹{formatCurrency(spent - limit)} over
                                </Text>
                              </View>
                            ) : isNear ? (
                              <View style={styles.nearBadge}>
                                <Text style={styles.nearBadgeText}>Near limit</Text>
                              </View>
                            ) : null}
                          </View>

                          <Text style={styles.catAmountText}>
                            ₹{formatCurrency(spent)}
                            {hasLimit ? (
                              <Text style={styles.catLimitDim}> / ₹{formatCurrency(limit)}</Text>
                            ) : (
                              <Text style={styles.noLimitTag}> · No limit</Text>
                            )}
                          </Text>
                        </View>

                        {/* Progress bar */}
                        {hasLimit ? (
                          <View style={styles.catProgressBarTrack}>
                            <View
                              style={[
                                styles.catProgressBarFill,
                                {
                                  width: `${Math.min(100, Math.max(2, percent))}%`,
                                  backgroundColor: barColor,
                                },
                              ]}
                            />
                          </View>
                        ) : null}

                        {/* Bottom hint */}
                        <View style={styles.catMetaRow}>
                          {hasLimit ? (
                            <>
                              <Text
                                style={[
                                  styles.catMetaText,
                                  isOver && { color: theme.colors.error, fontWeight: '600' },
                                ]}
                              >
                                {percent}% used
                              </Text>
                              <Text
                                style={[
                                  styles.catMetaText,
                                  isOver
                                    ? { color: theme.colors.error }
                                    : { color: theme.colors.onSurfaceVariant, fontWeight: '500' },
                                ]}
                              >
                                {isOver
                                  ? 'Limit exceeded'
                                  : `₹${formatCurrency(limit - spent)} left`}
                              </Text>
                            </>
                          ) : (
                            <Text style={styles.setLimitPrompt}>+ Tap to set monthly budget</Text>
                          )}
                        </View>
                      </View>

                      <ChevronRightIcon size={18} color={theme.colors.outline} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          /* ========================================================= */
          /* 2. GOALS VIEW                                             */
          /* ========================================================= */
          <View style={styles.viewContent}>
            {/* Top Goals Summary Banner */}
            <View style={styles.summaryCard}>
              <View style={styles.goalsSummaryRow}>
                <View style={styles.goalsSummaryCol}>
                  <Text style={styles.summarySubtitle}>Total Accumulated</Text>
                  <Text style={styles.summaryValue}>
                    ₹{formatCurrency(totalGoalsAccumulated)}
                  </Text>
                  <Text style={styles.milestoneCount}>
                    Across {goals.length} active milestone{goals.length === 1 ? '' : 's'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.newGoalActionBtn, { backgroundColor: theme.colors.emeraldDark }]}
                  onPress={handleOpenCreateGoal}
                  activeOpacity={0.8}
                >
                  <PlusIcon size={16} color={theme.colors.surfaceContainerLowest} />
                  <Text style={styles.newGoalActionText}>New Goal</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Empty state for goals */}
            {goals.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.emeraldLight }]}>
                  <TrophyIcon size={32} color={theme.colors.emeraldDark} />
                </View>
                <Text style={styles.emptyStateTitle}>Start your first savings goal</Text>
                <Text style={styles.emptyStateDesc}>
                  Whether it's an emergency buffer, dream vacation, or new tech gadget, create a milestone and deposit as you save.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: theme.colors.emeraldDark }]}
                  onPress={handleOpenCreateGoal}
                  activeOpacity={0.8}
                >
                  <PlusIcon size={16} color={theme.colors.surfaceContainerLowest} />
                  <Text style={styles.emptyActionText}>Create a Goal</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Goals Cards Stack */}
            <View style={styles.goalsStack}>
              {goals.map((goal: Goal) => {
                const saved = Number(goal.saved_amount) || 0;
                const target = Number(goal.target_amount) || 1;
                const pct = Math.min(100, Math.round((saved / target) * 100));
                const isComplete = saved >= target;
                const remaining = Math.max(0, target - saved);
                const IconComponent = getGoalIconComponent(goal.icon);
                const cardColor = goal.color || theme.colors.emeraldDark;

                return (
                  <View key={goal.id} style={styles.goalCard}>
                    {/* Goal Card Header */}
                    <View style={styles.goalHeaderRow}>
                      <View style={styles.goalTitleGroup}>
                        <View style={[styles.goalIconCircle, { backgroundColor: cardColor + '18' }]}>
                          <IconComponent size={22} color={cardColor} />
                        </View>
                        <View style={styles.goalTextCol}>
                          <Text style={styles.goalName} numberOfLines={1}>
                            {goal.name}
                          </Text>
                          {goal.target_date ? (
                            <Text style={styles.goalTargetDate}>
                              Target: {goal.target_date}
                            </Text>
                          ) : (
                            <Text style={styles.goalTargetDate}>No deadline</Text>
                          )}
                        </View>
                      </View>

                      {/* Header Actions: Edit & Add Pill */}
                      <View style={styles.goalHeaderActions}>
                        <TouchableOpacity
                          style={styles.goalIconButton}
                          onPress={() => handleOpenEditGoal(goal)}
                          activeOpacity={0.7}
                          accessibilityLabel="Edit goal"
                        >
                          <PencilIcon size={16} color={theme.colors.secondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.goalIconButton}
                          onPress={() => handleDeleteGoal(goal)}
                          activeOpacity={0.7}
                          accessibilityLabel="Delete goal"
                        >
                          <TrashIcon size={16} color={theme.colors.error} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.addDepositPill, { backgroundColor: theme.colors.emeraldLight }]}
                          onPress={() => handleOpenDepositSheet(goal)}
                          activeOpacity={0.8}
                        >
                          <PlusIcon size={14} color={theme.colors.emeraldDark} />
                          <Text style={styles.addDepositText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Numbers Row */}
                    <View style={styles.goalAmountsRow}>
                      <View style={styles.goalAmountValues}>
                        <Text style={styles.goalSavedAmount}>
                          ₹{formatCurrency(saved)}
                        </Text>
                        <Text style={styles.goalTargetDim}>
                          saved of ₹{formatCurrency(target)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.goalPercentBadge,
                          { color: isComplete ? theme.colors.emeraldDark : cardColor },
                        ]}
                      >
                        {pct}%
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.goalProgressBarTrack}>
                      <View
                        style={[
                          styles.goalProgressBarFill,
                          {
                            width: `${Math.max(2, pct)}%`,
                            backgroundColor: isComplete ? theme.colors.emeraldDark : cardColor,
                          },
                        ]}
                      />
                    </View>

                    {/* Bottom Status */}
                    <View style={styles.goalStatusRow}>
                      <Text style={styles.goalStatusText}>
                        {isComplete ? 'Goal target achieved!' : `₹${formatCurrency(remaining)} left to target`}
                      </Text>
                      {isComplete ? (
                        <View style={styles.goalAchievedPill}>
                          <CheckCircleIcon size={14} color={theme.colors.emeraldDark} />
                          <Text style={styles.goalAchievedText}>Completed</Text>
                        </View>
                      ) : (
                        <Text style={styles.goalScheduleText}>In progress</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* 3. CATEGORY BUDGET KEYPAD SHEET MODAL                     */}
      {/* ========================================================= */}
      <Modal
        visible={budgetSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBudgetSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setBudgetSheetVisible(false)}
          />
          <View style={[styles.sheetContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                {selectedCategory ? (
                  <View
                    style={[
                      styles.sheetCategoryIcon,
                      { backgroundColor: (selectedCategory.color || theme.colors.primary) + '18' },
                    ]}
                  >
                    <CategoryIcon
                      name={selectedCategory.name}
                      color={selectedCategory.color || theme.colors.primary}
                      size={20}
                    />
                  </View>
                ) : null}
                <View>
                  <Text style={styles.sheetTitle}>
                    {selectedCategory?.name || 'Category'} Budget
                  </Text>
                  <Text style={styles.sheetSubtitle}>Set monthly expense ceiling</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setBudgetSheetVisible(false)}
                activeOpacity={0.7}
              >
                <CloseIcon size={20} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Category Selector Chips */}
            <View style={styles.sheetCategorySelector}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sheetCategoryScroll}
              >
                {expenseCategories.map((cat: Category) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.sheetCatChip,
                        isSelected && styles.sheetCatChipActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedCategory(cat);
                        setBudgetInput(cat.budget_limit ? String(cat.budget_limit) : '');
                      }}
                      activeOpacity={0.75}
                    >
                      <CategoryIcon
                        name={cat.name}
                        size={15}
                        color={isSelected ? theme.colors.surfaceContainerLowest : (cat.color || theme.colors.primary)}
                      />
                      <Text
                        style={[
                          styles.sheetCatChipText,
                          isSelected && styles.sheetCatChipTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Amount Display */}
            <View style={styles.keypadAmountDisplay}>
              <Text style={styles.currencySymbol}>₹</Text>
              <Text style={styles.keypadAmountNumber}>
                {budgetInput ? formatCurrency(Number(budgetInput)) : '0'}
              </Text>
            </View>

            {/* Quick Presets */}
            <View style={styles.quickChipsRow}>
              {[2000, 5000, 10000, 20000].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.quickChip}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setBudgetInput(String(preset));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>₹{formatCurrency(preset)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Numeric Keypad */}
            <View style={styles.keypadContainer}>
              <NumericKeypad
                onPressDigit={handleBudgetDigit}
                onBackspace={handleBudgetBackspace}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.sheetActionRow}>
              {selectedCategory?.budget_limit ? (
                <TouchableOpacity
                  style={styles.clearBudgetBtn}
                  onPress={handleClearBudget}
                  disabled={updateBudgetMutation.isPending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearBudgetBtnText}>Clear Limit</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.saveBudgetBtn,
                  !selectedCategory?.budget_limit && { flex: 1 },
                ]}
                onPress={handleSaveBudget}
                disabled={updateBudgetMutation.isPending}
                activeOpacity={0.8}
              >
                {updateBudgetMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.surfaceContainerLowest} />
                ) : (
                  <Text style={styles.saveBudgetBtnText}>Save Budget</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 4. GOAL DEPOSIT KEYPAD SHEET MODAL                        */}
      {/* ========================================================= */}
      <Modal
        visible={depositSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDepositSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDepositSheetVisible(false)}
          />
          <View style={[styles.sheetContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  Add to {selectedGoal?.name || 'Goal'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  Current: ₹{formatCurrency(Number(selectedGoal?.saved_amount) || 0)} of ₹
                  {formatCurrency(Number(selectedGoal?.target_amount) || 0)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setDepositSheetVisible(false)}
                activeOpacity={0.7}
              >
                <CloseIcon size={20} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Amount Display */}
            <View style={styles.keypadAmountDisplay}>
              <Text style={[styles.currencySymbol, { color: theme.colors.emeraldDark }]}>+ ₹</Text>
              <Text style={[styles.keypadAmountNumber, { color: theme.colors.emeraldDark }]}>
                {depositInput ? formatCurrency(Number(depositInput)) : '0'}
              </Text>
            </View>

            {/* Quick Deposit Chips */}
            <View style={styles.quickChipsRow}>
              {[500, 1000, 2500, 5000].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.quickChip}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDepositInput(String(preset));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>+₹{formatCurrency(preset)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Numeric Keypad */}
            <View style={styles.keypadContainer}>
              <NumericKeypad
                onPressDigit={handleDepositDigit}
                onBackspace={handleDepositBackspace}
              />
            </View>

            {/* Confirm Deposit Button */}
            <TouchableOpacity
              style={[
                styles.saveBudgetBtn,
                { backgroundColor: theme.colors.emeraldDark },
              ]}
              onPress={handleConfirmDeposit}
              disabled={updateGoalMutation.isPending || !depositInput}
              activeOpacity={0.8}
            >
              {updateGoalMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.surfaceContainerLowest} />
              ) : (
                <Text style={styles.saveBudgetBtnText}>Confirm Deposit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 5. CREATE / EDIT GOAL MODAL                               */}
      {/* ========================================================= */}
      <Modal
        visible={goalFormVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGoalFormVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setGoalFormVisible(false)}
          />
          <View style={[styles.sheetContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
              </Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setGoalFormVisible(false)}
                activeOpacity={0.7}
              >
                <CloseIcon size={20} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Goal Name Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Goal Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Emergency Fund, Japan Trip"
                  placeholderTextColor={theme.colors.secondary}
                  value={goalName}
                  onChangeText={setGoalName}
                />
              </View>

              {/* Target Amount Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Target Amount (₹)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 50000"
                  placeholderTextColor={theme.colors.secondary}
                  keyboardType="numeric"
                  value={goalTargetAmount}
                  onChangeText={setGoalTargetAmount}
                />
              </View>

              {/* Target Date Field (Optional) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Target Date (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Dec 2026"
                  placeholderTextColor={theme.colors.secondary}
                  value={goalTargetDate}
                  onChangeText={setGoalTargetDate}
                />
              </View>

              {/* Color Swatches */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Accent Color</Text>
                <View style={styles.colorSwatchesRow}>
                  {GOAL_COLORS.map((col) => (
                    <TouchableOpacity
                      key={col.color}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: col.color },
                        goalColor === col.color && styles.colorSwatchSelected,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setGoalColor(col.color);
                      }}
                      activeOpacity={0.8}
                    />
                  ))}
                </View>
              </View>

              {/* Icon Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Icon</Text>
                <View style={styles.iconPickerRow}>
                  {GOAL_ICONS.map((item) => {
                    const Comp = item.Component;
                    const isSelected = goalIcon === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.iconPickButton,
                          isSelected && { borderColor: goalColor, backgroundColor: goalColor + '14' },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setGoalIcon(item.id);
                        }}
                        activeOpacity={0.8}
                      >
                        <Comp size={20} color={isSelected ? goalColor : theme.colors.secondary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveBudgetBtn,
                  { backgroundColor: goalColor, marginTop: 12 },
                ]}
                onPress={handleSaveGoalForm}
                disabled={createGoalMutation.isPending || updateGoalMutation.isPending}
                activeOpacity={0.8}
              >
                {createGoalMutation.isPending || updateGoalMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.surfaceContainerLowest} />
                ) : (
                  <Text style={styles.saveBudgetBtnText}>
                    {editingGoal ? 'Save Changes' : 'Create Goal'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 6. CELEBRATION MODAL (100% GOAL REACHED)                   */}
      {/* ========================================================= */}
      {celebrationGoal ? (
        <Modal transparent visible animationType="none">
          <View style={styles.celebrationBackdrop}>
            <Animated.View style={[styles.celebrationCard, celebrationAnimatedStyle]}>
              <View style={styles.celebrationIconWrap}>
                <TrophyIcon size={44} color={theme.colors.amber} />
              </View>
              <Text style={styles.celebrationTitle}>Goal Completed! 🎉</Text>
              <Text style={styles.celebrationSubtitle}>
                Congratulations! You have reached 100% of your target for "
                {celebrationGoal.name}".
              </Text>
              <View style={styles.celebrationBadge}>
                <Text style={styles.celebrationBadgeText}>
                  ₹{formatCurrency(Number(celebrationGoal.target_amount))} Saved
                </Text>
              </View>

              <TouchableOpacity
                style={styles.celebrationButton}
                onPress={closeCelebration}
                activeOpacity={0.8}
              >
                <Text style={styles.celebrationButtonText}>Woohoo!</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.margin,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.footnote,
    color: theme.colors.outline,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    ...theme.typography.title1,
    color: theme.colors.onSurface,
    fontWeight: '800',
    marginTop: 2,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.glow,
  },
  quickActionText: {
    ...theme.typography.footnote,
    color: theme.colors.surfaceContainerLowest,
    fontWeight: '700',
  },
  segmentedContainer: {
    paddingHorizontal: theme.spacing.margin,
    paddingVertical: theme.spacing.xs + 2,
  },
  segmentTrack: {
    height: 42,
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: 14,
    padding: 3,
    position: 'relative',
    alignItems: 'center',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 11,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    height: '100%',
  },
  segmentText: {
    ...theme.typography.subheadline,
    fontSize: 14,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.margin,
    paddingTop: theme.spacing.sm,
  },
  viewContent: {
    gap: theme.spacing.md,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
    gap: theme.spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summarySubtitle: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
  },
  summaryValue: {
    ...theme.typography.numeralHero,
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryFixed,
  },
  daysBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },

  // Progress bar
  progressSection: {
    gap: 6,
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.radii.pill,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercent: {
    ...theme.typography.footnote,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  progressAvailable: {
    ...theme.typography.footnote,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },

  // Metric Cards
  metricGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 10,
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
  },
  metricValue: {
    ...theme.typography.headline,
    color: theme.colors.onSurface,
    fontSize: 15,
  },

  // Empty state card
  emptyStateCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    ...theme.shadows.card,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    ...theme.typography.title3,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateDesc: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.radii.pill,
  },
  emptyActionText: {
    ...theme.typography.footnote,
    color: theme.colors.surfaceContainerLowest,
    fontWeight: '700',
  },

  // Category Budgets Group
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionTitle: {
    ...theme.typography.title3,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
  },
  categoryCardGroup: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceContainerHigh,
    marginVertical: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  catIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catInfoCol: {
    flex: 1,
    gap: 5,
  },
  catTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  catName: {
    ...theme.typography.headline,
    color: theme.colors.onSurface,
    fontSize: 15,
  },
  overBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
  },
  overBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.surfaceContainerLowest,
    fontSize: 10,
    fontWeight: '700',
  },
  nearBadge: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
  },
  nearBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '600',
  },
  catAmountText: {
    ...theme.typography.footnote,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  catLimitDim: {
    color: theme.colors.secondary,
    fontWeight: '400',
  },
  noLimitTag: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    fontWeight: '400',
  },
  catProgressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  catProgressBarFill: {
    height: '100%',
    borderRadius: theme.radii.pill,
  },
  catMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catMetaText: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
  },
  setLimitPrompt: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Goals Tab
  goalsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalsSummaryCol: {
    flex: 1,
  },
  milestoneCount: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  newGoalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radii.pill,
    shadowColor: theme.colors.emeraldDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  newGoalActionText: {
    ...theme.typography.footnote,
    color: theme.colors.surfaceContainerLowest,
    fontWeight: '700',
  },
  goalsStack: {
    gap: theme.spacing.md,
  },
  goalCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
    gap: 12,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  goalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTextCol: {
    flex: 1,
  },
  goalName: {
    ...theme.typography.headline,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  goalTargetDate: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  goalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDepositPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.pill,
  },
  addDepositText: {
    ...theme.typography.caption,
    color: theme.colors.emeraldDark,
    fontWeight: '700',
  },
  goalAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  goalAmountValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  goalSavedAmount: {
    ...theme.typography.title2,
    color: theme.colors.onSurface,
    fontWeight: '800',
  },
  goalTargetDim: {
    ...theme.typography.footnote,
    color: theme.colors.secondary,
  },
  goalPercentBadge: {
    ...theme.typography.headline,
    fontWeight: '800',
  },
  goalProgressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  goalProgressBarFill: {
    height: '100%',
    borderRadius: theme.radii.pill,
  },
  goalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalStatusText: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
  },
  goalAchievedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalAchievedText: {
    ...theme.typography.caption,
    color: theme.colors.emeraldDark,
    fontWeight: '700',
  },
  goalScheduleText: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    fontWeight: '500',
  },

  // Modal Sheet Components
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalBackdrop: {
    flex: 1,
  },
  sheetContent: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: theme.spacing.margin,
    paddingTop: 12,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceContainerHighest,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetCategoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    ...theme.typography.title3,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  sheetSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCategorySelector: {
    marginBottom: 12,
  },
  sheetCategoryScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  sheetCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.surfaceContainerHigh,
  },
  sheetCatChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sheetCatChipText: {
    ...theme.typography.caption,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  sheetCatChipTextActive: {
    color: theme.colors.surfaceContainerLowest,
    fontWeight: '700',
  },
  keypadAmountDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 18,
    marginBottom: 12,
    gap: 6,
  },
  currencySymbol: {
    ...theme.typography.title2,
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  keypadAmountNumber: {
    ...theme.typography.numeralHero,
    color: theme.colors.onSurface,
    fontWeight: '800',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    ...theme.typography.caption,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  keypadContainer: {
    marginBottom: 16,
  },
  sheetActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  clearBudgetBtn: {
    flex: 1,
    height: 50,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBudgetBtnText: {
    ...theme.typography.callout,
    color: theme.colors.error,
    fontWeight: '700',
  },
  saveBudgetBtn: {
    flex: 2,
    height: 50,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.elevatedButton,
  },
  saveBudgetBtnText: {
    ...theme.typography.callout,
    color: theme.colors.surfaceContainerLowest,
    fontWeight: '700',
  },

  // Form Fields
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    ...theme.typography.footnote,
    color: theme.colors.secondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...theme.typography.body,
    color: theme.colors.onSurface,
  },
  colorSwatchesRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: theme.colors.onSurface,
  },
  iconPickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  iconPickButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  // Celebration Modal
  celebrationBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  celebrationCard: {
    width: '100%',
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  celebrationIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  celebrationTitle: {
    ...theme.typography.title2,
    color: theme.colors.onSurface,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  celebrationSubtitle: {
    ...theme.typography.subheadline,
    color: theme.colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  celebrationBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.emeraldLight,
    borderRadius: theme.radii.pill,
    marginBottom: 20,
  },
  celebrationBadgeText: {
    ...theme.typography.headline,
    color: theme.colors.emeraldDark,
    fontWeight: '800',
  },
  celebrationButton: {
    width: '100%',
    height: 50,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.emeraldDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glow,
  },
  celebrationButtonText: {
    ...theme.typography.callout,
    color: theme.colors.surfaceContainerLowest,
    fontWeight: '800',
  },
});
