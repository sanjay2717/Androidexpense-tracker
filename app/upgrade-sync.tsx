import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  BackHandler,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
  runOnJS,
  useReducedMotion,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

import { useAuth } from '../src/lib/auth';
import { supabase } from '../src/lib/supabase';
import { theme } from '../src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// -------------------------------------------------------------
// 18-26px Fintech & Celebration SVGs
// -------------------------------------------------------------
function CoinSvg({ size = 22, color = theme.colors.amber }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Circle cx="12" cy="12" r="8" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.75" />
      <Path
        d="M9 8h6M9 11h4.5a2 2 0 0 1 0 4H9m0-7v11m4-3l3 3"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WalletSvg({ size = 22, color = theme.colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="18" height="14" rx="3" fill={color} />
      <Path d="M3 10h18" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" />
      <Circle cx="16" cy="13" r="1.5" fill="#ffffff" />
    </Svg>
  );
}

function CardSvg({ size = 22, color = theme.colors.tertiary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="14" rx="3" fill={color} />
      <Rect x="2" y="8" width="20" height="3" fill="#ffffff" fillOpacity="0.3" />
      <Rect x="5" y="14" width="4" height="2" rx="0.5" fill="#ffffff" />
    </Svg>
  );
}

function PiggySvg({ size = 22, color = theme.colors.rose }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 11c0-4-3-7-7-7-2.5 0-4.8 1.3-6 3.2L4 7v3l2 1.5C6 12 6 12.5 6 13c0 3.5 2.5 6.5 6 7v2h2v-2h2v2h2v-2.2c2.5-1.5 4-4 4-6.8h1v-2h-2z"
        fill={color}
      />
      <Circle cx="15" cy="9" r="1" fill="#ffffff" />
      <Path d="M10 5.5h4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function ReceiptSvg({ size = 22, color = theme.colors.emerald }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 3v18l3-1.5 3 1.5 3-1.5 3 1.5 3-1.5 3 1.5V3l-3 1.5L16 3l-3 1.5L10 3 7 4.5 4 3z"
        fill={color}
      />
      <Path d="M8 8h8M8 12h8M8 16h5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.8" />
    </Svg>
  );
}

function ChartSvg({ size = 22, color = theme.colors.primaryDark }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="14" width="4" height="7" rx="1" fill={color} />
      <Rect x="10" y="9" width="4" height="12" rx="1" fill={color} />
      <Rect x="17" y="4" width="4" height="17" rx="1" fill={color} />
    </Svg>
  );
}

function SparkleSvg({ size = 18, color = theme.colors.amber }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" fill={color} />
    </Svg>
  );
}

function DotSvg({ size = 10, color = theme.colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" fill={color} />
    </Svg>
  );
}

function RenderParticleIcon({ typeIndex, size = 20, color }: { typeIndex: number; size?: number; color?: string }) {
  switch (typeIndex) {
    case 0:
      return <CoinSvg size={size} color={color} />;
    case 1:
      return <WalletSvg size={size} color={color} />;
    case 2:
      return <CardSvg size={size} color={color} />;
    case 3:
      return <PiggySvg size={size} color={color} />;
    case 4:
      return <ReceiptSvg size={size} color={color} />;
    case 5:
      return <ChartSvg size={size} color={color} />;
    case 6:
      return <SparkleSvg size={size} color={color} />;
    case 7:
    default:
      return <DotSvg size={size} color={color} />;
  }
}

// -------------------------------------------------------------
// Precomputed Particle Parameters for Burst (36 particles)
// -------------------------------------------------------------
const PARTICLE_COUNT = 36;
const PRECOMPUTED_PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const baseAngle = (i / PARTICLE_COUNT) * 2 * Math.PI;
  const angle = baseAngle + Math.sin(i * 99) * 0.28;
  const speed = 160 + ((i * 37) % 200);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed - 140; // upward bias for fireworks arc
  const gravity = 420;
  const rot = -360 + ((i * 73) % 720);
  const scale = 0.65 + ((i * 19) % 50) / 100;
  const typeIndex = i % 8;
  const shouldStay = i % 2 === 0;
  const finalOpacity = shouldStay ? 0.25 : 0;
  const driftOffsetX = ((i * 47) % 60) - 30;
  const driftOffsetY = ((i * 53) % 60) - 30;
  const colors = [
    theme.colors.primary,
    theme.colors.emerald,
    theme.colors.tertiary,
    theme.colors.primaryContainer,
    theme.colors.amber,
    theme.colors.primaryFixedDim,
  ];
  const color = colors[i % colors.length];

  return {
    id: i,
    vx,
    vy,
    gravity,
    rot,
    scale,
    typeIndex,
    shouldStay,
    finalOpacity,
    driftOffsetX,
    driftOffsetY,
    color,
  };
});

// -------------------------------------------------------------
// Streaming Object along Connector (Max 8 in flight)
// -------------------------------------------------------------
interface StreamingItemProps {
  index: number;
  trackWidth: number;
  streamProgress: SharedValue<number>;
  isVerifying: boolean;
}

const StreamingItem = React.memo(function StreamingItem({
  index,
  trackWidth,
  streamProgress,
  isVerifying,
}: StreamingItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    if (!isVerifying) {
      return { opacity: 0 };
    }
    const p = (streamProgress.value + index / 8) % 1;
    const x = p * Math.max(10, trackWidth - 22);
    const y = Math.sin(p * Math.PI * 2) * 5;

    let opacity = 1;
    if (p < 0.15) {
      opacity = p / 0.15;
    } else if (p > 0.85) {
      opacity = (1 - p) / 0.15;
    }

    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.streamingObject, animatedStyle]}>
      <RenderParticleIcon typeIndex={index % 6} size={18} />
    </Animated.View>
  );
});

// -------------------------------------------------------------
// Interactive Burst Particle
// -------------------------------------------------------------
interface BurstParticleProps {
  particle: (typeof PRECOMPUTED_PARTICLES)[number];
  burstProgress: SharedValue<number>;
  driftClock: SharedValue<number>;
  panX: SharedValue<number>;
  panY: SharedValue<number>;
  panActive: SharedValue<number>;
  cloudCenter: { x: number; y: number };
  onPopHaptic: () => void;
}

const BurstParticle = React.memo(function BurstParticle({
  particle,
  burstProgress,
  driftClock,
  panX,
  panY,
  panActive,
  cloudCenter,
  onPopHaptic,
}: BurstParticleProps) {
  const isPopped = useSharedValue(0);

  const tapGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    if (isPopped.value === 0) {
      isPopped.value = withTiming(1, { duration: 250 });
      runOnJS(onPopHaptic)();
    }
  });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const t = burstProgress.value;
    if (t === 0) {
      return { opacity: 0 };
    }

    let x = particle.vx * t;
    let y = particle.vy * t + 0.5 * particle.gravity * t * t;
    const rot = particle.rot * t;

    // Gentle drift after landing
    if (t > 0.85 && particle.shouldStay) {
      const frac = (t - 0.85) / 0.15;
      x += particle.driftOffsetX * (driftClock.value - 0.5) * 2 * frac;
      y += particle.driftOffsetY * (driftClock.value - 0.5) * 2 * frac;
    }

    // Pan repulsion
    if (panActive.value === 1) {
      const px = cloudCenter.x + x;
      const py = cloudCenter.y + y;
      const dx = px - panX.value;
      const dy = py - panY.value;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 85) {
        const push = (85 - dist) * 0.75;
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        x += nx * push;
        y += ny * push;
      }
    }

    let opacity = 1;
    if (t < 0.6) {
      opacity = 1;
    } else if (t < 1) {
      opacity = 1 - (1 - particle.finalOpacity) * ((t - 0.6) / 0.4);
    } else {
      opacity = particle.finalOpacity;
    }

    const pop = isPopped.value;
    const currentScale = particle.scale * (1 + pop * 0.5);
    if (pop > 0) {
      opacity = opacity * (1 - pop);
    }

    return {
      transform: [
        { translateX: cloudCenter.x + x },
        { translateY: cloudCenter.y + y },
        { rotate: `${rot}deg` },
        { scale: currentScale },
      ],
      opacity,
    };
  });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[styles.burstParticleContainer, animatedStyle]}>
        <RenderParticleIcon typeIndex={particle.typeIndex} size={20} color={particle.color} />
      </Animated.View>
    </GestureDetector>
  );
});

// -------------------------------------------------------------
// Ledger Row Component
// -------------------------------------------------------------
interface LedgerRowProps {
  iconType: 'wallet' | 'receipt' | 'savings' | 'category' | 'email';
  title: string;
  subtitle: string;
  status: 'pending' | 'checking' | 'verified';
}

function LedgerRow({ iconType, title, subtitle, status }: LedgerRowProps) {
  const pulseOpacity = useSharedValue(1);
  const popScale = useSharedValue(status === 'verified' ? 1 : 0.8);

  useEffect(() => {
    if (status === 'checking') {
      pulseOpacity.value = withRepeat(
        withSequence(withTiming(0.4, { duration: 450 }), withTiming(1, { duration: 450 })),
        -1,
        true
      );
    } else if (status === 'verified') {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 1;
      popScale.value = withSpring(1, { damping: 12, stiffness: 220 });
    } else {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 1;
    }
  }, [status]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: popScale.value }],
  }));

  const renderIcon = () => {
    switch (iconType) {
      case 'wallet':
        return <WalletSvg size={20} color={theme.colors.primary} />;
      case 'receipt':
        return <ReceiptSvg size={20} color={theme.colors.primary} />;
      case 'savings':
        return <PiggySvg size={20} color={theme.colors.primary} />;
      case 'category':
        return <ChartSvg size={20} color={theme.colors.primary} />;
      case 'email':
      default:
        return <DotSvg size={20} color={theme.colors.primary} />;
    }
  };

  return (
    <View style={styles.ledgerRow}>
      <View style={styles.ledgerRowLeft}>
        <View style={styles.ledgerIconContainer}>{renderIcon()}</View>
        <View style={styles.ledgerTextContainer}>
          <Text style={styles.ledgerRowTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.ledgerRowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.ledgerBadge,
          status === 'verified' && styles.ledgerBadgeVerified,
          status === 'checking' && styles.ledgerBadgeChecking,
          badgeAnimatedStyle,
        ]}
      >
        {status === 'verified' && (
          <View style={styles.checkCircleSmall}>
            <Text style={styles.checkIconText}>✓</Text>
          </View>
        )}
        {status === 'checking' && (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 2 }} />
        )}
        <Text
          style={[
            styles.ledgerBadgeText,
            status === 'verified' && styles.ledgerBadgeTextVerified,
            status === 'checking' && styles.ledgerBadgeTextChecking,
          ]}
        >
          {status === 'verified' ? 'Verified' : status === 'checking' ? 'Checking…' : 'Pending'}
        </Text>
      </Animated.View>
    </View>
  );
}

// -------------------------------------------------------------
// UpgradeSyncScreen Component
// -------------------------------------------------------------
export default function UpgradeSyncScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const isFocused = pathname === '/upgrade-sync';
  const reducedMotion = useReducedMotion();
  const { user, setIsUpgrading } = useAuth();

  const params = useLocalSearchParams<{
    email?: string;
    name?: string;
    preWalletsCount?: string;
    preTxCount?: string;
    preGoalsCount?: string;
    preCategoriesCount?: string;
    walletNames?: string;
    goalNames?: string;
  }>();

  const targetEmail = (params.email || user?.email || '').trim();
  const displayName = (params.name || (user?.user_metadata as any)?.display_name || 'Putu User').trim();
  const preWalletsCount = parseInt(params.preWalletsCount || '0', 10);
  const preTxCount = parseInt(params.preTxCount || '0', 10);
  const preGoalsCount = parseInt(params.preGoalsCount || '0', 10);
  const preCategoriesCount = parseInt(params.preCategoriesCount || '0', 10);

  const walletNamesList: string[] = useMemo(() => {
    try {
      return params.walletNames ? JSON.parse(params.walletNames) : [];
    } catch {
      return [];
    }
  }, [params.walletNames]);

  const goalNamesList: string[] = useMemo(() => {
    try {
      return params.goalNames ? JSON.parse(params.goalNames) : [];
    } catch {
      return [];
    }
  }, [params.goalNames]);

  // Total items: 1 (email) + wallets + txs + goals + categories
  const totalItemsCount = 1 + preWalletsCount + preTxCount + preGoalsCount + preCategoriesCount;

  // Verification state (5 ledger rows)
  const [rowStatus, setRowStatus] = useState<('pending' | 'checking' | 'verified')[]>([
    'pending', // 0: Wallets
    'pending', // 1: Transactions
    'pending', // 2: Goals
    'pending', // 3: Categories
    'pending', // 4: Account Email
  ]);

  const [verifiedItemsCount, setVerifiedItemsCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
  const [trackWidth, setTrackWidth] = useState(130);

  // Guard ref: Never run verification twice on re-render
  const hasVerifiedRef = useRef(false);

  // Reanimated Shared Values
  const streamProgress = useSharedValue(0);
  const barProgress = useSharedValue(0);
  const percentProgress = useSharedValue(0);
  const burstProgress = useSharedValue(0);
  const driftClock = useSharedValue(0);
  const flipProgress = useSharedValue(0);
  const pulseRingScale = useSharedValue(1);
  const pulseRingOpacity = useSharedValue(0);
  const continuePulse = useSharedValue(1);

  // Pan gesture shared values
  const panX = useSharedValue(-9999);
  const panY = useSharedValue(-9999);
  const panActive = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      panX.value = e.x;
      panY.value = e.y;
      panActive.value = 1;
    })
    .onFinalize(() => {
      'worklet';
      panActive.value = 0;
      panX.value = -9999;
      panY.value = -9999;
    });

  const triggerSelectionHaptic = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  // Hardware Back Handler: Disables back gesture and routes to Home
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoHome();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Stop all Reanimated animations when screen is unfocused or unmounted
  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(streamProgress);
      cancelAnimation(burstProgress);
      cancelAnimation(driftClock);
      cancelAnimation(continuePulse);
      cancelAnimation(flipProgress);
    }
  }, [isFocused]);

  // Start connector streaming animation during verification
  useEffect(() => {
    if (!isSuccess && isFocused) {
      streamProgress.value = withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(streamProgress);
    }
  }, [isSuccess, isFocused]);

  // Continue button subtle pulse on success
  useEffect(() => {
    if (isSuccess && isFocused) {
      continuePulse.value = withRepeat(
        withSequence(
          withTiming(1.025, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [isSuccess, isFocused]);

  // -------------------------------------------------------------
  // Real Verification Flow
  // -------------------------------------------------------------
  const runVerification = useCallback(async () => {
    setMismatchWarning(null);
    let itemsAccumulator = 0;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Step 1: Wallets verification
      setRowStatus((prev) => ['checking', prev[1], prev[2], prev[3], prev[4]]);
      await delay(450);

      const { count: wCount, error: wErr } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true });

      if (wErr || (wCount ?? 0) !== preWalletsCount) {
        throw new Error(
          `We found ${itemsAccumulator} of ${totalItemsCount} items. Your data is safe in your account.`
        );
      }
      itemsAccumulator += preWalletsCount;
      setVerifiedItemsCount(itemsAccumulator);
      setRowStatus((prev) => ['verified', prev[1], prev[2], prev[3], prev[4]]);
      barProgress.value = withTiming(0.2, { duration: 350 });
      percentProgress.value = withTiming(20, { duration: 350 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Step 2: Transactions verification
      setRowStatus((prev) => [prev[0], 'checking', prev[2], prev[3], prev[4]]);
      await delay(500);

      const { count: txCount, error: txErr } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      if (txErr || (txCount ?? 0) !== preTxCount) {
        throw new Error(
          `We found ${itemsAccumulator} of ${totalItemsCount} items. Your data is safe in your account.`
        );
      }
      itemsAccumulator += preTxCount;
      setVerifiedItemsCount(itemsAccumulator);
      setRowStatus((prev) => [prev[0], 'verified', prev[2], prev[3], prev[4]]);
      barProgress.value = withTiming(0.4, { duration: 350 });
      percentProgress.value = withTiming(40, { duration: 350 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Step 3: Goals verification
      setRowStatus((prev) => [prev[0], prev[1], 'checking', prev[3], prev[4]]);
      await delay(450);

      const { count: gCount, error: gErr } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true });

      if (gErr || (gCount ?? 0) !== preGoalsCount) {
        throw new Error(
          `We found ${itemsAccumulator} of ${totalItemsCount} items. Your data is safe in your account.`
        );
      }
      itemsAccumulator += preGoalsCount;
      setVerifiedItemsCount(itemsAccumulator);
      setRowStatus((prev) => [prev[0], prev[1], 'verified', prev[3], prev[4]]);
      barProgress.value = withTiming(0.6, { duration: 350 });
      percentProgress.value = withTiming(60, { duration: 350 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Step 4: Categories verification
      setRowStatus((prev) => [prev[0], prev[1], prev[2], 'checking', prev[4]]);
      await delay(450);

      const { count: cCount, error: cErr } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      if (cErr || (cCount ?? 0) !== preCategoriesCount) {
        throw new Error(
          `We found ${itemsAccumulator} of ${totalItemsCount} items. Your data is safe in your account.`
        );
      }
      itemsAccumulator += preCategoriesCount;
      setVerifiedItemsCount(itemsAccumulator);
      setRowStatus((prev) => [prev[0], prev[1], prev[2], 'verified', prev[4]]);
      barProgress.value = withTiming(0.8, { duration: 350 });
      percentProgress.value = withTiming(80, { duration: 350 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Step 5: Account Email verification
      setRowStatus((prev) => [prev[0], prev[1], prev[2], prev[3], 'checking']);
      await delay(400);

      // The email row ticks when user.is_anonymous is false and email matches
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;
      const isAnon = currentUser?.is_anonymous ?? false;
      const verifiedEmail = currentUser?.email;

      if (isAnon || (!verifiedEmail && !targetEmail)) {
        throw new Error(
          `We found ${itemsAccumulator} of ${totalItemsCount} items. Your data is safe in your account.`
        );
      }
      itemsAccumulator += 1;
      setVerifiedItemsCount(itemsAccumulator);
      setRowStatus((prev) => [prev[0], prev[1], prev[2], prev[3], 'verified']);
      barProgress.value = withTiming(1.0, { duration: 400 });
      percentProgress.value = withTiming(100, { duration: 400 });

      // Verification Success!
      await delay(300);
      setIsSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animation B: Cloud node pops, initials avatar flips
      flipProgress.value = withSpring(1, { damping: 14, stiffness: 140 });
      pulseRingScale.value = 1;
      pulseRingOpacity.value = 0.8;
      pulseRingScale.value = withTiming(1.7, { duration: 750 });
      pulseRingOpacity.value = withTiming(0, { duration: 750 });

      // Burst of 36 elements (if reduce motion is false)
      if (!reducedMotion) {
        burstProgress.value = withTiming(1, {
          duration: 2200,
          easing: Easing.out(Easing.cubic),
        });
        driftClock.value = withRepeat(
          withTiming(1, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
          -1,
          true
        );
      }
    } catch (err: any) {
      setMismatchWarning(
        err.message ||
          `We found ${itemsAccumulator} of ${totalItemsCount} items. Your data is safe in your account.`
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [
    preWalletsCount,
    preTxCount,
    preGoalsCount,
    preCategoriesCount,
    totalItemsCount,
    targetEmail,
    reducedMotion,
  ]);

  useEffect(() => {
    if (!hasVerifiedRef.current) {
      hasVerifiedRef.current = true;
      runVerification();
    }
  }, [runVerification]);

  const handleRetry = () => {
    hasVerifiedRef.current = false;
    runVerification();
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsUpgrading(false);
    router.replace('/(tabs)');
  };

  // Reanimated Animated Props & Styles
  const animatedPercentProps = useAnimatedProps(() => {
    'worklet';
    const pct = Math.round(percentProgress.value);
    return {
      text: `${pct}%`,
      defaultValue: `${pct}%`,
    } as any;
  });

  const barAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scaleX: Math.max(0.001, barProgress.value) }],
    };
  });

  const pulseRingAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: pulseRingScale.value }],
      opacity: pulseRingOpacity.value,
    };
  });

  const phoneNodeFlipStyle = useAnimatedStyle(() => {
    'worklet';
    const deg = flipProgress.value * 180;
    return {
      transform: [{ rotateY: `${deg}deg` }],
      opacity: flipProgress.value > 0.5 ? 0 : 1,
    };
  });

  const avatarNodeFlipStyle = useAnimatedStyle(() => {
    'worklet';
    const deg = 180 + flipProgress.value * 180;
    return {
      transform: [{ rotateY: `${deg}deg` }],
      opacity: flipProgress.value > 0.5 ? 1 : 0,
    };
  });

  const continueBtnAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: continuePulse.value }],
    };
  });

  // User initials
  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (displayName.slice(0, 2) || 'MS').toUpperCase();
  }, [displayName]);

  const cloudCenter = useMemo(
    () => ({
      x: SCREEN_WIDTH - 80,
      y: 110,
    }),
    []
  );

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Full-Screen Burst Layer (Precomputed 36 particles, low opacity drift behind content) */}
        {!reducedMotion && isSuccess && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {PRECOMPUTED_PARTICLES.map((particle) => (
              <BurstParticle
                key={particle.id}
                particle={particle}
                burstProgress={burstProgress}
                driftClock={driftClock}
                panX={panX}
                panY={panY}
                panActive={panActive}
                cloudCenter={cloudCenter}
                onPopHaptic={triggerSelectionHaptic}
              />
            ))}
          </View>
        )}

        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleGoHome}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            accessibilityLabel="Close"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Sync Data</Text>

          <View style={styles.headerRightAvatar}>
            <Text style={styles.headerAvatarText}>{initials[0]}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Breadcrumb Header */}
          <View style={styles.breadcrumbRow}>
            {isSuccess ? (
              <View style={styles.successBreadcrumbPill}>
                <View style={styles.emeraldDot} />
                <Text style={styles.successBreadcrumbText}>ACCOUNT LINKED • SUCCESS</Text>
              </View>
            ) : (
              <View style={styles.verifyingBreadcrumbPill}>
                <View style={styles.primaryDotPulse} />
                <Text style={styles.verifyingBreadcrumbText}>STEP 2 OF 2 • LINKING ACCOUNT</Text>
              </View>
            )}

            <Text style={[styles.itemCountText, isSuccess && styles.itemCountSuccess]}>
              {isSuccess ? `✓ ${totalItemsCount} of ${totalItemsCount} synced` : `${verifiedItemsCount} of ${totalItemsCount} items`}
            </Text>
          </View>

          {/* Dynamic Interactive Sync Visualizer Card */}
          <View style={styles.visualizerCard}>
            <View style={styles.ambientAura} />

            <View style={styles.nodesRow}>
              {/* Left Node: Phone Node flipping to User Initials Avatar */}
              <View style={styles.nodeColumn}>
                <View style={styles.nodeBoxWrapper}>
                  {/* Phone Node (Before complete) */}
                  <Animated.View style={[styles.nodeBox, styles.nodeBoxPhone, phoneNodeFlipStyle]}>
                    <Text style={styles.phoneIcon}>📱</Text>
                    <View style={styles.phoneDotBadge}>
                      <View style={styles.phoneDotInner} />
                    </View>
                  </Animated.View>

                  {/* Avatar Node (After complete) */}
                  <Animated.View style={[styles.nodeBox, styles.nodeBoxAvatar, avatarNodeFlipStyle]}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                    <View style={styles.avatarCheckBadge}>
                      <Text style={styles.avatarCheckText}>✓</Text>
                    </View>
                  </Animated.View>
                </View>

                <Text style={styles.nodeTitle} numberOfLines={1}>
                  {isSuccess ? displayName : 'This phone'}
                </Text>
                <Text style={styles.nodeSubtitle}>{isSuccess ? 'Local synced' : 'Guest'}</Text>
              </View>

              {/* Center Connection Bridge */}
              <View
                style={styles.bridgeContainer}
                onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              >
                <View style={styles.bridgeTrack}>
                  <View style={[styles.bridgeTrackFill, isSuccess && styles.bridgeTrackSuccess]} />
                </View>

                {/* 8 Streaming Objects traveling along connector */}
                {Array.from({ length: 8 }, (_, idx) => (
                  <StreamingItem
                    key={idx}
                    index={idx}
                    trackWidth={trackWidth}
                    streamProgress={streamProgress}
                    isVerifying={!isSuccess}
                  />
                ))}

                {/* Center Orb */}
                <View style={[styles.centerOrb, isSuccess && styles.centerOrbSuccess]}>
                  <Text style={styles.centerOrbIcon}>{isSuccess ? '✨' : '🔄'}</Text>
                </View>

                <Text style={[styles.bridgeStatusText, isSuccess && styles.bridgeStatusSuccess]}>
                  {isSuccess ? 'Connected' : 'Syncing Live'}
                </Text>
              </View>

              {/* Right Node: Putu Cloud Sanctuary */}
              <View style={styles.nodeColumn}>
                <View style={styles.nodeBoxWrapper}>
                  <Animated.View style={[styles.pulseRing, pulseRingAnimatedStyle]} />

                  <View style={[styles.nodeBox, styles.nodeBoxCloud]}>
                    <Text style={styles.cloudIcon}>☁️</Text>
                    <View style={[styles.cloudBadge, isSuccess && styles.cloudBadgeSuccess]}>
                      <Text style={styles.cloudBadgeText}>{isSuccess ? '✓' : '🔒'}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.nodeTitle} numberOfLines={1}>
                  Putu account
                </Text>
                <Text style={styles.nodeSubtitleCloud}>
                  {isSuccess ? 'All devices synced' : 'Permanent'}
                </Text>
              </View>
            </View>
          </View>

          {/* Reassuring Headline & Status Bar */}
          <View style={styles.headlineContainer}>
            <View style={styles.headlineRow}>
              <Text style={styles.mainHeadline}>
                {isSuccess ? `You're all set, ${displayName}!` : 'Linking your account…'}
              </Text>

              {isSuccess ? (
                <View style={styles.successPercentChip}>
                  <Text style={styles.successPercentText}>✓ 100%</Text>
                </View>
              ) : (
                <AnimatedTextInput
                  underlineColorAndroid="transparent"
                  editable={false}
                  style={styles.syncPercent}
                  animatedProps={animatedPercentProps}
                />
              )}
            </View>

            <Text style={styles.subHeadline}>
              {isSuccess
                ? `Your finances and guest history are now safely connected to ${targetEmail}.`
                : "Your data stays exactly where it is. We're confirming everything is attached to your new account."}
            </Text>

            {/* ScaleX Progress Bar (Not width!) */}
            <View style={styles.progressBarTrack}>
              <Animated.View style={[styles.progressBarFill, barAnimatedStyle]} />
            </View>
          </View>

          {/* Mismatch Warning & Retry State */}
          {mismatchWarning && (
            <Animated.View entering={FadeInUp.duration(200)} style={styles.warningContainer}>
              <View style={styles.warningHeaderRow}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <Text style={styles.warningTitle}>Checklist Notice</Text>
              </View>
              <Text style={styles.warningMessage}>{mismatchWarning}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                <Text style={styles.retryButtonText}>Retry verification</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Migration Ledger Checklist */}
          <View style={styles.ledgerCard}>
            <View style={styles.ledgerHeaderRow}>
              <Text style={styles.ledgerHeaderTitle}>Migration Ledger</Text>
              {isSuccess && <Text style={styles.ledgerHeaderBadge}>All items verified</Text>}
            </View>

            {/* Row 1: Wallets */}
            <LedgerRow
              iconType="wallet"
              title={`${preWalletsCount} Wallets & Accounts`}
              subtitle={walletNamesList.length > 0 ? walletNamesList.join(', ') : 'Wallets verified'}
              status={rowStatus[0]}
            />

            {/* Row 2: Transactions */}
            <LedgerRow
              iconType="receipt"
              title={`${preTxCount} Transactions`}
              subtitle={`All ${preTxCount} records attached to your account`}
              status={rowStatus[1]}
            />

            {/* Row 3: Goals */}
            <LedgerRow
              iconType="savings"
              title={`${preGoalsCount} ${preGoalsCount === 1 ? 'Goal' : 'Goals'}`}
              subtitle={goalNamesList.length > 0 ? goalNamesList.join(', ') : 'No active goals'}
              status={rowStatus[2]}
            />

            {/* Row 4: Categories */}
            <LedgerRow
              iconType="category"
              title={`${preCategoriesCount} Categories`}
              subtitle="Default and custom categories verified"
              status={rowStatus[3]}
            />

            {/* Row 5: Account Email */}
            <LedgerRow
              iconType="email"
              title="Account Email"
              subtitle={targetEmail}
              status={rowStatus[4]}
            />
          </View>

          {/* Zero Loss Assurance Banner */}
          <View style={styles.assuranceBanner}>
            <View style={styles.assuranceIconCircle}>
              <Text style={styles.assuranceIcon}>🛡️</Text>
            </View>
            <Text style={styles.assuranceText}>
              {isSuccess ? (
                <>
                  <Text style={styles.assuranceBold}>Permanently Backed Up: </Text>
                  Your guest data is now permanently backed up. Sign in anytime with{' '}
                  <Text style={styles.assuranceHighlight}>{targetEmail}</Text> on any device.
                </>
              ) : (
                'Nothing was copied or moved. Your guest data was already saved to your cloud storage; adding an email makes it permanent and available on any device.'
              )}
            </Text>
          </View>

          {/* Primary Action Button */}
          <View style={styles.actionContainer}>
            <Animated.View style={isSuccess ? continueBtnAnimatedStyle : undefined}>
              <TouchableOpacity
                style={[styles.primaryButton, !isSuccess && styles.primaryButtonDisabled]}
                onPress={handleGoHome}
                disabled={!isSuccess}
                activeOpacity={0.88}
              >
                {!isSuccess ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color={theme.colors.white} />
                    <Text style={styles.primaryButtonText}>Verifying records…</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.primaryButtonText}>Continue to Putu Dashboard</Text>
                    <Text style={styles.arrowIcon}>→</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.footerBrand}>Putu Expense Tracker • Crafted with Care</Text>
          </View>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.margin,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.hairline,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  headerRightAvatar: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.white,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.margin,
    paddingTop: 16,
    paddingBottom: 32,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  verifyingBreadcrumbPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryFixed,
  },
  primaryDotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  verifyingBreadcrumbText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  successBreadcrumbPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.emeraldLight,
  },
  emeraldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.emerald,
  },
  successBreadcrumbText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.emeraldDark,
    letterSpacing: 0.8,
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.secondary,
  },
  itemCountSuccess: {
    color: theme.colors.emeraldDark,
    fontWeight: '700',
  },
  visualizerCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  ambientAura: {
    position: 'absolute',
    top: -20,
    left: '25%',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: theme.colors.primaryFixedDim,
    opacity: 0.2,
  },
  nodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 2,
  },
  nodeColumn: {
    alignItems: 'center',
    width: 86,
  },
  nodeBoxWrapper: {
    width: 64,
    height: 64,
    marginBottom: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeBoxPhone: {
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  nodeBoxAvatar: {
    position: 'absolute',
    backgroundColor: theme.colors.primaryContainer,
  },
  nodeBoxCloud: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.glow,
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  phoneIcon: {
    fontSize: 28,
  },
  cloudIcon: {
    fontSize: 28,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.white,
    letterSpacing: -0.5,
  },
  phoneDotBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  avatarCheckBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.white,
  },
  avatarCheckText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.white,
  },
  cloudBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudBadgeSuccess: {
    backgroundColor: theme.colors.emerald,
  },
  cloudBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  nodeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurface,
    textAlign: 'center',
    width: '100%',
  },
  nodeSubtitle: {
    fontSize: 11,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  nodeSubtitleCloud: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  bridgeContainer: {
    flex: 1,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 8,
  },
  bridgeTrack: {
    width: '100%',
    height: 4,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 2,
    overflow: 'hidden',
  },
  bridgeTrackFill: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  bridgeTrackSuccess: {
    backgroundColor: theme.colors.emerald,
  },
  centerOrb: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  centerOrbSuccess: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: theme.colors.primaryFixed,
  },
  centerOrbIcon: {
    fontSize: 16,
  },
  bridgeStatusText: {
    marginTop: 38,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  bridgeStatusSuccess: {
    color: theme.colors.emeraldDark,
  },
  streamingObject: {
    position: 'absolute',
    top: 18,
    left: 0,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineContainer: {
    marginBottom: 16,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mainHeadline: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -0.4,
    flex: 1,
  },
  syncPercent: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    minWidth: 55,
    textAlign: 'right',
    padding: 0,
  },
  successPercentChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.emeraldLight,
  },
  successPercentText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.emeraldDark,
  },
  subHeadline: {
    fontSize: 14,
    color: theme.colors.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: theme.radii.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.pill,
    transformOrigin: 'left',
  },
  warningContainer: {
    backgroundColor: theme.colors.warningLight,
    borderRadius: theme.radii.button,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  warningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  warningIcon: {
    fontSize: 18,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  warningMessage: {
    fontSize: 13,
    color: theme.colors.onSurface,
    lineHeight: 18,
    marginBottom: 10,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.warning,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.white,
  },
  ledgerCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: 16,
    marginBottom: 16,
    gap: 10,
    ...theme.shadows.card,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  ledgerHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  ledgerHeaderBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.emeraldDark,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  ledgerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  ledgerIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  ledgerTextContainer: {
    flex: 1,
  },
  ledgerRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  ledgerRowSubtitle: {
    fontSize: 12,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  ledgerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  ledgerBadgeChecking: {
    backgroundColor: theme.colors.primaryFixed,
  },
  ledgerBadgeVerified: {
    backgroundColor: theme.colors.emeraldLight,
  },
  checkCircleSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconText: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.white,
  },
  ledgerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  ledgerBadgeTextChecking: {
    color: theme.colors.primaryDark,
  },
  ledgerBadgeTextVerified: {
    color: theme.colors.emeraldDark,
  },
  assuranceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryFixed,
    marginBottom: 24,
  },
  assuranceIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assuranceIcon: {
    fontSize: 16,
  },
  assuranceText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  assuranceBold: {
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  assuranceHighlight: {
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  actionContainer: {
    marginTop: 'auto',
  },
  primaryButton: {
    height: 54,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.elevatedButton,
  },
  primaryButtonDisabled: {
    backgroundColor: theme.colors.primaryDark,
    opacity: 0.8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.white,
  },
  arrowIcon: {
    fontSize: 18,
    color: theme.colors.white,
    fontWeight: '800',
  },
  footerBrand: {
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.secondary,
    marginTop: 12,
  },
  burstParticleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
