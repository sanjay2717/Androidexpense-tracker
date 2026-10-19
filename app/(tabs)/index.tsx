import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useHomeDashboardData } from '../../src/lib/api';
import { useLoading } from '../../src/context/LoadingContext';
import { CountUpText } from '../../src/components/CountUpText';
import { DonutChart } from '../../src/components/DonutChart';
import { HomeSkeleton } from '../../src/components/Skeleton';
import {
  BellIcon,
  TuneIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  CategoryIcon,
  ShieldCheckIcon,
} from '../../src/components/Icons';
import { theme } from '../../src/theme';

const AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAdqbp3YTpg4Et60AdMRCSqIgEhcZfSr1hamEXUdGzq_pt4mvpjN632b-gwGoe31r92WgE1M7pX82MoeIploaeWsSG4ARFEy-SlYtDG7WSFNkM6WkWNi6VarZtLwCytCuQC7y3oLDVGGPlVQTzgfxcFQg39tbxgMP9x-wojBhiBntmd1r4BGTDMdoomwtXYJRMP1qJ_RaFd3LymtrfpQ-HcwUYe0YZoEGOTcoAEqXUhZ2uXJrLOXRiBBA';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { metrics, isLoading, isError, error, refetch } = useHomeDashboardData();
  const { reloadApp } = useLoading();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings');
  };

  const handleNotificationsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTransactionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });

  return (
    <View style={[styles.rootContainer, { paddingTop: insets.top }]}>
      {/* Pinned Top Bar / Warm Greeting - stays fixed when scrolling */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: AVATAR_URL }} style={styles.avatarImage} />
            <View style={styles.avatarDot} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.greetingText}>GOOD MORNING</Text>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>Aarav Patel</Text>
              <View style={styles.verifiedDot}>
                <Text style={styles.verifiedCheck}>✓</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleNotificationsPress}
            activeOpacity={0.7}
          >
            <BellIcon size={20} color={theme.colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleSettingsPress}
            activeOpacity={0.7}
          >
            <TuneIcon size={20} color={theme.colors.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content Area */}
      {isLoading && !refreshing ? (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content}>
          <HomeSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 110 + Math.max(insets.bottom, 24) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >

      {/* Error State Banner if needed */}
      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Unable to connect to live database. Displaying local data.
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hero Large Balance Card */}
      <View style={styles.balanceCard}>
        {/* Subtle ambient decorative radial glow */}
        <View style={styles.cardAmbientGlow} />

        <View style={styles.balanceCardHeader}>
          <Text style={styles.balanceCardLabel}>Total Balance</Text>
          <View style={styles.liveWalletBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveWalletText}>Live Wallet</Text>
          </View>
        </View>

        {/* Animated Count-up Hero Balance */}
        <View style={styles.heroAmountRow}>
          <Text style={styles.heroCurrency}>₹</Text>
          <CountUpText
            value={metrics.totalBalance}
            style={styles.heroAmountText}
            formatter={(v) => v.toLocaleString('en-IN')}
          />
          <Text style={styles.heroDecimals}>.00</Text>
        </View>

        {/* Income & Expense Strip */}
        <View style={styles.stripContainer}>
          {/* Income Block */}
          <View style={styles.stripBlock}>
            <View style={styles.incomeIconCircle}>
              <ArrowUpIcon size={16} color={theme.colors.emeraldDark} />
            </View>
            <View style={styles.stripTextBlock}>
              <Text style={styles.stripLabel}>Income</Text>
              <Text style={styles.incomeAmount} numberOfLines={1}>
                +₹{metrics.monthlyIncome.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Expense Block */}
          <View style={styles.stripBlock}>
            <View style={styles.expenseIconCircle}>
              <ArrowDownIcon size={16} color={theme.colors.primaryDark} />
            </View>
            <View style={styles.stripTextBlock}>
              <Text style={styles.stripLabel}>Expenses</Text>
              <Text style={styles.expenseAmount} numberOfLines={1}>
                -₹{metrics.monthlyExpenses.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Monthly Budget Progress Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.titleWithDot}>
            <View style={styles.budgetDot} />
            <Text style={styles.cardTitle}>Monthly Budget</Text>
          </View>
          <View style={styles.budgetPctBadge}>
            <Text style={styles.budgetPctText}>{metrics.spentPercentage}% used</Text>
          </View>
        </View>

        <View style={styles.budgetAmountsRow}>
          <View style={styles.spentAmountCol}>
            <Text style={styles.spentAmountText}>
              ₹{metrics.spent.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.spentLabel}> spent</Text>
          </View>
          <Text style={styles.targetBudgetText}>
            Target: <Text style={styles.targetBold}>₹{metrics.targetBudget.toLocaleString('en-IN')}</Text>
          </Text>
        </View>

        {/* Sleek Progress Track */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.max(4, metrics.spentPercentage))}%` },
            ]}
          />
        </View>

        {/* Micro status note */}
        <View style={styles.budgetFooterRow}>
          <View style={styles.safeCapRow}>
            <CheckCircleIcon size={14} color={theme.colors.emeraldDark} />
            <Text style={styles.safeCapText}>
              Safe daily cap: <Text style={styles.boldText}>₹{metrics.safeDailyCap.toLocaleString('en-IN')}/day</Text>
            </Text>
          </View>
          <Text style={styles.leftBudgetText}>
            ₹{metrics.leftInBudget.toLocaleString('en-IN')} left
          </Text>
        </View>
      </View>

      {/* Category Spending Donut Chart Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Spending by Category</Text>
          <Text style={styles.monthTag}>{currentMonthName.toUpperCase()}</Text>
        </View>

        {/* Donut Chart with Reanimated Entrance */}
        <DonutChart
          data={metrics.categorySpending}
          totalAmount={metrics.monthlyExpenses}
        />
      </View>

      {/* Recent Transactions Section */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/modal')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRightIcon size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsCard}>
          {metrics.recentTransactions.slice(0, 5).map((item, index) => {
            const isIncome = item.type === 'income';
            const categoryName = item.category?.name || 'General';

            return (
              <TouchableOpacity
                key={item.id || String(index)}
                style={[
                  styles.txRow,
                  index % 2 === 1 && styles.txRowAlt,
                ]}
                onPress={handleTransactionPress}
                activeOpacity={0.7}
              >
                <View style={styles.txLeft}>
                  <View
                    style={[
                      styles.txIconContainer,
                      isIncome
                        ? { backgroundColor: theme.colors.emeraldLight }
                        : { backgroundColor: theme.colors.primaryFixed },
                    ]}
                  >
                    <CategoryIcon
                      name={item.note || categoryName}
                      color={isIncome ? theme.colors.emeraldDark : theme.colors.primaryContainer}
                      size={20}
                    />
                  </View>
                  <View style={styles.txTextCol}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {item.note || categoryName}
                    </Text>
                    <Text style={styles.txMeta} numberOfLines={1}>
                      {categoryName} · {isIncome ? 'Income' : 'Expense'}
                    </Text>
                  </View>
                </View>

                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      isIncome ? styles.txAmountIncome : styles.txAmountExpense,
                    ]}
                  >
                    {isIncome ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.txTag}>
                    {isIncome ? 'Credited' : (item.wallet?.name || 'HDFC Card')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Quick Action Pill Row */}
      <View style={styles.syncPillContainer}>
        <View style={styles.syncPill}>
          <ShieldCheckIcon size={16} color={theme.colors.primary} />
          <Text style={styles.syncText}>All accounts synced safely 2m ago</Text>
        </View>
      </View>

      {/* Interactive App Reload / Replay Splash Button */}
      <View style={styles.reloadContainer}>
        <TouchableOpacity
          style={styles.reloadButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            reloadApp();
          }}
          activeOpacity={0.75}
        >
          <View style={styles.reloadIconCircle}>
            <Text style={styles.reloadIconText}>↻</Text>
          </View>
          <View style={styles.reloadTextCol}>
            <Text style={styles.reloadTitle}>Reload App Experience</Text>
            <Text style={styles.reloadSubtitle}>Replay Zen splash & refresh live metrics</Text>
          </View>
          <ChevronRightIcon size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.margin,
    paddingTop: 8,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.margin,
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceContainerHighest,
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
    borderColor: '#ffffff',
  },
  headerTextCol: {
    justifyContent: 'center',
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
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  errorBanner: {
    backgroundColor: '#fff1f2',
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  cardAmbientGlow: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.primaryFixed,
    opacity: 0.35,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  balanceCardLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.secondary,
  },
  liveWalletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.emerald,
  },
  liveWalletText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  heroCurrency: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -1,
  },
  heroAmountText: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -1,
  },
  heroDecimals: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  stripContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 8,
    gap: 8,
  },
  stripBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    gap: 8,
  },
  incomeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.emeraldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.roseLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripTextBlock: {
    flex: 1,
  },
  stripLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.secondary,
  },
  incomeAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.emeraldDark,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryContainer,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  budgetPctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryMuted,
  },
  budgetPctText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  budgetAmountsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spentAmountCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  spentAmountText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  spentLabel: {
    fontSize: 13,
    color: theme.colors.secondary,
  },
  targetBudgetText: {
    fontSize: 13,
    color: theme.colors.secondary,
  },
  targetBold: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.secondaryContainer,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: theme.colors.primaryContainer,
  },
  budgetFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safeCapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  safeCapText: {
    fontSize: 12,
    color: theme.colors.secondary,
  },
  boldText: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  leftBudgetText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  monthTag: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
  },
  transactionsSection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  transactionsCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  txRowAlt: {
    backgroundColor: 'rgba(244, 243, 248, 0.45)',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 8,
  },
  txIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTextCol: {
    flex: 1,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  txMeta: {
    fontSize: 12,
    color: theme.colors.secondary,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  txAmountIncome: {
    color: theme.colors.emeraldDark,
  },
  txAmountExpense: {
    color: theme.colors.onSurface,
  },
  txTag: {
    fontSize: 11,
    color: theme.colors.secondary,
  },
  syncPillContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    ...theme.shadows.card,
  },
  syncText: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  reloadContainer: {
    marginVertical: 6,
    marginBottom: 12,
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 120, 0.15)',
    shadowColor: '#1F1D24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  reloadIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reloadIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF2D78',
    marginTop: -2,
  },
  reloadTextCol: {
    flex: 1,
  },
  reloadTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#1F1D24',
  },
  reloadSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#76747E',
    marginTop: 2,
  },
});
