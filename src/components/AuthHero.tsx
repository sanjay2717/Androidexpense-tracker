import React, { useEffect, useState, memo } from 'react';
import { View, StyleSheet, AccessibilityInfo, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedKeyboard,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Svg, {
  Circle,
  Path,
  Rect,
  G,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { theme } from '../theme';

export type FocusedField = 'name' | 'email' | 'password' | null;

interface AuthHeroProps {
  focusedField: FocusedField;
  isFormValid: boolean;
  errorTrigger?: number;
  successTrigger?: number;
}

// Memoized SVG for Rupee Coin
const RupeeCoinSvg = memo(({ bounceAnimStyle }: { bounceAnimStyle: any }) => (
  <Animated.View style={bounceAnimStyle}>
    <Svg width="44" height="44" viewBox="0 0 44 44">
      <Defs>
        <LinearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={theme.colors.amberLight} />
          <Stop offset="50%" stopColor={theme.colors.amber} />
          <Stop offset="100%" stopColor={theme.colors.warning} />
        </LinearGradient>
      </Defs>
      <Circle cx="22" cy="22" r="20" fill="url(#coinGrad)" />
      <Circle cx="22" cy="22" r="16" fill="none" stroke={theme.colors.amberLight} strokeWidth="1.5" />
      <SvgText
        x="22"
        y="28"
        textAnchor="middle"
        fontSize="17"
        fontWeight="800"
        fill={theme.colors.onSurface}
      >
        ₹
      </SvgText>
    </Svg>
  </Animated.View>
));

// Memoized SVG for Mini Pocket Wallet
const WalletSvg = memo(({ bounceAnimStyle }: { bounceAnimStyle: any }) => (
  <Animated.View style={bounceAnimStyle}>
    <Svg width="48" height="36" viewBox="0 0 48 36">
      <Defs>
        <LinearGradient id="walletGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={theme.colors.primaryFixed} />
          <Stop offset="100%" stopColor={theme.colors.primaryContainer} />
        </LinearGradient>
      </Defs>
      <Rect x="2" y="2" width="44" height="32" rx="8" fill="url(#walletGrad)" />
      <Rect x="2" y="10" width="44" height="6" fill={theme.colors.surfaceContainerLowest} opacity="0.3" />
      <Rect x="30" y="12" width="14" height="12" rx="4" fill={theme.colors.surfaceContainerLowest} />
      <Circle cx="37" cy="18" r="2.5" fill={theme.colors.primaryContainer} />
    </Svg>
  </Animated.View>
));

// Memoized SVG for Mini Credit Card
const CardSvg = memo(({ bounceAnimStyle }: { bounceAnimStyle: any }) => (
  <Animated.View style={bounceAnimStyle}>
    <Svg width="54" height="34" viewBox="0 0 54 34">
      <Defs>
        <LinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={theme.colors.surfaceContainerLowest} />
          <Stop offset="100%" stopColor={theme.colors.surfaceContainerHigh} />
        </LinearGradient>
      </Defs>
      <Rect x="1" y="1" width="52" height="32" rx="6" fill="url(#cardGrad)" stroke={theme.colors.hairline} strokeWidth="1" />
      <Rect x="6" y="6" width="10" height="7" rx="2" fill={theme.colors.amberLight} />
      <SvgText x="6" y="26" fontSize="7" fontWeight="700" fill={theme.colors.secondary}>
        PUTU
      </SvgText>
      <Circle cx="44" cy="22" r="4" fill={theme.colors.primary} opacity="0.6" />
    </Svg>
  </Animated.View>
));

// Memoized SVG for Piggy Bank
const PiggySvg = memo(({ bounceAnimStyle }: { bounceAnimStyle: any }) => (
  <Animated.View style={bounceAnimStyle}>
    <Svg width="40" height="40" viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="piggyGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={theme.colors.primaryFixedDim} />
          <Stop offset="100%" stopColor={theme.colors.primaryFixed} />
        </LinearGradient>
      </Defs>
      <Rect x="2" y="2" width="36" height="36" rx="14" fill="url(#piggyGrad)" />
      <Circle cx="16" cy="16" r="2" fill={theme.colors.primaryDark} />
      <Rect x="20" y="8" width="8" height="2" rx="1" fill={theme.colors.primaryDark} opacity="0.4" />
      <Circle cx="28" cy="20" r="4" fill={theme.colors.primaryContainer} opacity="0.4" />
    </Svg>
  </Animated.View>
));

// Memoized SVG for Receipt Slip
const ReceiptSvg = memo(({ bounceAnimStyle }: { bounceAnimStyle: any }) => (
  <Animated.View style={bounceAnimStyle}>
    <Svg width="30" height="38" viewBox="0 0 30 38">
      <Rect x="1" y="1" width="28" height="36" rx="3" fill={theme.colors.surfaceContainerLowest} stroke={theme.colors.hairline} strokeWidth="1" />
      <Rect x="5" y="7" width="18" height="2" rx="1" fill={theme.colors.outlineVariant} />
      <Rect x="5" y="12" width="14" height="2" rx="1" fill={theme.colors.outlineVariant} opacity="0.6" />
      <Rect x="5" y="17" width="20" height="2" rx="1" fill={theme.colors.outlineVariant} />
      <Rect x="5" y="22" width="10" height="2" rx="1" fill={theme.colors.outlineVariant} opacity="0.6" />
      <Path d="M 1 36 L 6 33 L 11 36 L 16 33 L 21 36 L 26 33 L 29 36" stroke={theme.colors.surfaceContainerHigh} strokeWidth="1" fill="none" />
    </Svg>
  </Animated.View>
));

// Memoized SVG for Bar Chart Pill
const ChartSvg = memo(({ bounceAnimStyle }: { bounceAnimStyle: any }) => (
  <Animated.View style={bounceAnimStyle}>
    <Svg width="42" height="34" viewBox="0 0 42 34">
      <Rect x="1" y="1" width="40" height="32" rx="8" fill={theme.colors.surfaceContainerLowest} stroke={theme.colors.hairline} strokeWidth="1" />
      <Rect x="7" y="18" width="6" height="9" rx="3" fill={theme.colors.tertiaryFixed} />
      <Rect x="17" y="12" width="6" height="15" rx="3" fill={theme.colors.primaryFixedDim} />
      <Rect x="27" y="7" width="6" height="20" rx="3" fill={theme.colors.primaryContainer} />
    </Svg>
  </Animated.View>
));

export function AuthHero({
  focusedField,
  isFormValid,
  errorTrigger = 0,
  successTrigger = 0,
}: AuthHeroProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const keyboard = useAnimatedKeyboard();

  // Touch Parallax shared values
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);

  // Avatar eye and gesture shared values
  const pupilX = useSharedValue(0);
  const pupilY = useSharedValue(0);
  const handCoverProgress = useSharedValue(0); // 0 = hands down, 1 = covering eyes
  const blinkScale = useSharedValue(1);
  const smileScale = useSharedValue(1);
  const headShakeX = useSharedValue(0);
  const jumpY = useSharedValue(0);
  const coinBurstOpacity = useSharedValue(0);

  // Object bounce shared values on tap
  const bounceCoin = useSharedValue(1);
  const bounceWallet = useSharedValue(1);
  const bounceCard = useSharedValue(1);
  const bouncePiggy = useSharedValue(1);
  const bounceReceipt = useSharedValue(1);
  const bounceChart = useSharedValue(1);

  // Looping floats for 6 objects
  const floatCoinY = useSharedValue(0);
  const floatCoinR = useSharedValue(0);

  const floatWalletY = useSharedValue(0);
  const floatWalletR = useSharedValue(0);

  const floatCardY = useSharedValue(0);
  const floatCardR = useSharedValue(0);

  const floatPiggyY = useSharedValue(0);
  const floatPiggyR = useSharedValue(0);

  const floatReceiptY = useSharedValue(0);
  const floatReceiptR = useSharedValue(0);

  const floatChartY = useSharedValue(0);
  const floatChartR = useSharedValue(0);

  // Initialize looping float animations - pause when keyboard/input is focused to preserve 90 FPS
  useEffect(() => {
    const isTyping = focusedField !== null;

    if (reduceMotion || isTyping) {
      cancelAnimation(floatCoinY);
      cancelAnimation(floatCoinR);
      cancelAnimation(floatWalletY);
      cancelAnimation(floatWalletR);
      cancelAnimation(floatCardY);
      cancelAnimation(floatCardR);
      cancelAnimation(floatPiggyY);
      cancelAnimation(floatPiggyR);
      cancelAnimation(floatReceiptY);
      cancelAnimation(floatReceiptR);
      cancelAnimation(floatChartY);
      cancelAnimation(floatChartR);

      floatCoinY.value = withTiming(0, { duration: 200 });
      floatCoinR.value = withTiming(0, { duration: 200 });
      floatWalletY.value = withTiming(0, { duration: 200 });
      floatWalletR.value = withTiming(0, { duration: 200 });
      floatCardY.value = withTiming(0, { duration: 200 });
      floatCardR.value = withTiming(0, { duration: 200 });
      floatPiggyY.value = withTiming(0, { duration: 200 });
      floatPiggyR.value = withTiming(0, { duration: 200 });
      floatReceiptY.value = withTiming(0, { duration: 200 });
      floatReceiptR.value = withTiming(0, { duration: 200 });
      floatChartY.value = withTiming(0, { duration: 200 });
      floatChartR.value = withTiming(0, { duration: 200 });
      return;
    }

    // Coin float
    floatCoinY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(10, { duration: 1800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    floatCoinR.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2100, easing: Easing.inOut(Easing.quad) }),
        withTiming(6, { duration: 2100, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Wallet float
    floatWalletY.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        withTiming(-12, { duration: 2200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    floatWalletR.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-5, { duration: 2400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Card float
    floatCardY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
        withTiming(8, { duration: 1900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    floatCardR.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(4, { duration: 2000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Piggy float
    floatPiggyY.value = withRepeat(
      withSequence(
        withTiming(9, { duration: 2050, easing: Easing.inOut(Easing.quad) }),
        withTiming(-9, { duration: 2050, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    floatPiggyR.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 2300, easing: Easing.inOut(Easing.quad) }),
        withTiming(-6, { duration: 2300, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Receipt float
    floatReceiptY.value = withRepeat(
      withSequence(
        withTiming(-11, { duration: 1750, easing: Easing.inOut(Easing.quad) }),
        withTiming(11, { duration: 1750, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    floatReceiptR.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 1950, easing: Easing.inOut(Easing.quad) }),
        withTiming(-4, { duration: 1950, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Chart float
    floatChartY.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 2150, easing: Easing.inOut(Easing.quad) }),
        withTiming(-8, { duration: 2150, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    floatChartR.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2250, easing: Easing.inOut(Easing.quad) }),
        withTiming(5, { duration: 2250, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(floatCoinY);
      cancelAnimation(floatCoinR);
      cancelAnimation(floatWalletY);
      cancelAnimation(floatWalletR);
      cancelAnimation(floatCardY);
      cancelAnimation(floatCardR);
      cancelAnimation(floatPiggyY);
      cancelAnimation(floatPiggyR);
      cancelAnimation(floatReceiptY);
      cancelAnimation(floatReceiptR);
      cancelAnimation(floatChartY);
      cancelAnimation(floatChartR);
    };
  }, [reduceMotion, focusedField]);

  // Periodic random blinking
  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      blinkScale.value = withSequence(
        withTiming(0.1, { duration: 75 }),
        withTiming(1, { duration: 90 })
      );
    }, 3800);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  // Handle focused field glance & eye covering
  useEffect(() => {
    if (focusedField === 'name') {
      pupilX.value = withSpring(-4, { damping: 14 });
      pupilY.value = withSpring(0, { damping: 14 });
      handCoverProgress.value = withSpring(0, { damping: 15 });
    } else if (focusedField === 'email') {
      pupilX.value = withSpring(0, { damping: 14 });
      pupilY.value = withSpring(1.5, { damping: 14 });
      handCoverProgress.value = withSpring(0, { damping: 15 });
    } else if (focusedField === 'password') {
      // Hands cover eyes!
      pupilX.value = withSpring(0, { damping: 14 });
      pupilY.value = withSpring(0, { damping: 14 });
      handCoverProgress.value = withSpring(1, { damping: 12 });
    } else {
      // Idle
      pupilX.value = withSpring(0, { damping: 14 });
      pupilY.value = withSpring(0, { damping: 14 });
      handCoverProgress.value = withSpring(0, { damping: 15 });
    }
  }, [focusedField]);

  // Form validity smile widening
  useEffect(() => {
    smileScale.value = withSpring(isFormValid ? 1.35 : 1, { damping: 14 });
  }, [isFormValid]);

  // Error head shake
  useEffect(() => {
    if (errorTrigger > 0 && !reduceMotion) {
      headShakeX.value = withSequence(
        withTiming(-9, { duration: 55 }),
        withTiming(9, { duration: 60 }),
        withTiming(-6, { duration: 55 }),
        withTiming(6, { duration: 55 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [errorTrigger, reduceMotion]);

  // Success jump & coin burst
  useEffect(() => {
    if (successTrigger > 0 && !reduceMotion) {
      jumpY.value = withSequence(
        withTiming(-24, { duration: 240, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 320, easing: Easing.bounce })
      );
      coinBurstOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) })
      );
    }
  }, [successTrigger, reduceMotion]);

  // Touch Pan Gesture for Parallax
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      panX.value = e.translationX;
      panY.value = e.translationY;
    })
    .onEnd(() => {
      panX.value = withSpring(0, { damping: 15 });
      panY.value = withSpring(0, { damping: 15 });
    });

  // Tapping object helpers
  const triggerBounce = (sharedBounce: SharedValue<number>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sharedBounce.value = withSequence(
      withTiming(1.22, { duration: 110 }),
      withSpring(1, { damping: 10 })
    );
  };

  const coinTapGesture = Gesture.Tap().onEnd(() => triggerBounce(bounceCoin));
  const walletTapGesture = Gesture.Tap().onEnd(() => triggerBounce(bounceWallet));
  const cardTapGesture = Gesture.Tap().onEnd(() => triggerBounce(bounceCard));
  const piggyTapGesture = Gesture.Tap().onEnd(() => triggerBounce(bouncePiggy));
  const receiptTapGesture = Gesture.Tap().onEnd(() => triggerBounce(bounceReceipt));
  const chartTapGesture = Gesture.Tap().onEnd(() => triggerBounce(bounceChart));

  // Animated Styles for Parallax Floating Objects
  const coinStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value * 0.12 },
      { translateY: floatCoinY.value + panY.value * 0.12 },
      { rotate: `${floatCoinR.value}deg` },
    ],
  }));

  const walletStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value * 0.14 },
      { translateY: floatWalletY.value + panY.value * 0.14 },
      { rotate: `${floatWalletR.value}deg` },
    ],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value * 0.09 },
      { translateY: floatCardY.value + panY.value * 0.09 },
      { rotate: `${floatCardR.value}deg` },
    ],
  }));

  const piggyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value * 0.11 },
      { translateY: floatPiggyY.value + panY.value * 0.11 },
      { rotate: `${floatPiggyR.value}deg` },
    ],
  }));

  const receiptStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value * 0.08 },
      { translateY: floatReceiptY.value + panY.value * 0.08 },
      { rotate: `${floatReceiptR.value}deg` },
    ],
  }));

  const chartStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value * 0.1 },
      { translateY: floatChartY.value + panY.value * 0.1 },
      { rotate: `${floatChartR.value}deg` },
    ],
  }));

  // Tap Bounce Styles
  const bounceCoinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceCoin.value }],
  }));
  const bounceWalletStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceWallet.value }],
  }));
  const bounceCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceCard.value }],
  }));
  const bouncePiggyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bouncePiggy.value }],
  }));
  const bounceReceiptStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceReceipt.value }],
  }));
  const bounceChartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceChart.value }],
  }));

  // Avatar group animation style (head shake + jump + parallax)
  const avatarGroupStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: headShakeX.value + panX.value * 0.06 },
      { translateY: jumpY.value + panY.value * 0.06 },
    ],
  }));

  // Pupil glances
  const pupilStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pupilX.value },
      { translateY: pupilY.value },
      { scaleY: blinkScale.value },
    ],
  }));

  // Eye covering hands
  const handsStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          handCoverProgress.value,
          [0, 1],
          [22, -2],
          Extrapolation.CLAMP
        ),
      },
    ],
    opacity: interpolate(
      handCoverProgress.value,
      [0, 0.2, 1],
      [0, 0.7, 1],
      Extrapolation.CLAMP
    ),
  }));

  // Smile expansion style
  const smileAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: smileScale.value }],
  }));

  // Success coin burst
  const burstStyle = useAnimatedStyle(() => ({
    opacity: coinBurstOpacity.value,
    transform: [
      {
        translateY: interpolate(
          coinBurstOpacity.value,
          [0, 1],
          [10, -28],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  // Smooth keyboard collapse style
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const kHeight = keyboard.height.value;
    return {
      height: interpolate(kHeight, [0, 260], [178, 68], Extrapolation.CLAMP),
      opacity: interpolate(kHeight, [0, 260], [1, 0.35], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(kHeight, [0, 260], [1, 0.88], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {/* Ambient Glow */}
        <View style={styles.glow} />

        {/* Floating Fintech Objects Canvas */}
        <View style={styles.floatingObjectsContainer} pointerEvents="box-none">
          {/* 1. Rupee Coin */}
          <GestureDetector gesture={coinTapGesture}>
            <Animated.View style={[styles.objCoin, coinStyle]}>
              <RupeeCoinSvg bounceAnimStyle={bounceCoinStyle} />
            </Animated.View>
          </GestureDetector>

          {/* 2. Wallet */}
          <GestureDetector gesture={walletTapGesture}>
            <Animated.View style={[styles.objWallet, walletStyle]}>
              <WalletSvg bounceAnimStyle={bounceWalletStyle} />
            </Animated.View>
          </GestureDetector>

          {/* 3. Credit Card */}
          <GestureDetector gesture={cardTapGesture}>
            <Animated.View style={[styles.objCard, cardStyle]}>
              <CardSvg bounceAnimStyle={bounceCardStyle} />
            </Animated.View>
          </GestureDetector>

          {/* 4. Piggy Bank */}
          <GestureDetector gesture={piggyTapGesture}>
            <Animated.View style={[styles.objPiggy, piggyStyle]}>
              <PiggySvg bounceAnimStyle={bouncePiggyStyle} />
            </Animated.View>
          </GestureDetector>

          {/* 5. Receipt */}
          <GestureDetector gesture={receiptTapGesture}>
            <Animated.View style={[styles.objReceipt, receiptStyle]}>
              <ReceiptSvg bounceAnimStyle={bounceReceiptStyle} />
            </Animated.View>
          </GestureDetector>

          {/* 6. Mini Bar Chart */}
          <GestureDetector gesture={chartTapGesture}>
            <Animated.View style={[styles.objChart, chartStyle]}>
              <ChartSvg bounceAnimStyle={bounceChartStyle} />
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Success Burst Overlay */}
        <Animated.View style={[styles.burstContainer, burstStyle]} pointerEvents="none">
          <Svg width="120" height="40" viewBox="0 0 120 40">
            <Circle cx="20" cy="20" r="8" fill={theme.colors.amber} />
            <Circle cx="60" cy="12" r="10" fill={theme.colors.primary} />
            <Circle cx="100" cy="22" r="7" fill={theme.colors.amberLight} />
          </Svg>
        </Animated.View>

        {/* 4 Original Peeking Blob Characters */}
        <Animated.View style={[styles.avatarsRow, avatarGroupStyle]}>
          {/* Character 1: Electric Pink Blob */}
          <View style={styles.blobPink}>
            <Svg width="54" height="46" viewBox="0 0 54 46">
              <Defs>
                <LinearGradient id="pinkBlobGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={theme.colors.primaryFixed} />
                  <Stop offset="50%" stopColor={theme.colors.primaryFixedDim} />
                  <Stop offset="100%" stopColor={theme.colors.primary} />
                </LinearGradient>
              </Defs>
              <Path d="M 4 46 C 4 14, 50 14, 50 46 Z" fill="url(#pinkBlobGrad)" />
              {/* Rosy Cheeks */}
              <Circle cx="14" cy="30" r="3" fill={theme.colors.primaryContainer} opacity="0.3" />
              <Circle cx="40" cy="30" r="3" fill={theme.colors.primaryContainer} opacity="0.3" />
            </Svg>

            {/* Glanceable Animated Pupils */}
            <Animated.View style={[styles.pupilsPinkContainer, pupilStyle]}>
              <View style={styles.pupilDot} />
              <View style={styles.pupilDot} />
            </Animated.View>

            {/* Mouth / Smile */}
            <Animated.View style={[styles.mouthPink, smileAnimStyle]}>
              <Svg width="14" height="6" viewBox="0 0 14 6">
                <Path d="M 1 1 Q 7 7 13 1" stroke={theme.colors.onSurface} strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </Svg>
            </Animated.View>

            {/* Eye Covering Hands */}
            <Animated.View style={[styles.handsPink, handsStyle]}>
              <View style={styles.handLeft} />
              <View style={styles.handRight} />
            </Animated.View>
          </View>

          {/* Character 2: Mint / Calm Blob */}
          <View style={styles.blobMint}>
            <Svg width="48" height="38" viewBox="0 0 48 38">
              <Defs>
                <LinearGradient id="mintBlobGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={theme.colors.surfaceContainerHigh} />
                  <Stop offset="100%" stopColor={theme.colors.surfaceContainer} />
                </LinearGradient>
              </Defs>
              <Path d="M 4 38 C 4 12, 44 12, 44 38 Z" fill="url(#mintBlobGrad)" />
              <Circle cx="13" cy="24" r="2.5" fill={theme.colors.outlineVariant} opacity="0.5" />
              <Circle cx="35" cy="24" r="2.5" fill={theme.colors.outlineVariant} opacity="0.5" />
            </Svg>

            <Animated.View style={[styles.pupilsMintContainer, pupilStyle]}>
              <View style={styles.pupilDotMint} />
              <View style={styles.pupilDotMint} />
            </Animated.View>

            <Animated.View style={[styles.mouthMint, smileAnimStyle]}>
              <Svg width="12" height="5" viewBox="0 0 12 5">
                <Path d="M 1 1 Q 6 6 11 1" stroke={theme.colors.onSurface} strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </Svg>
            </Animated.View>

            <Animated.View style={[styles.handsMint, handsStyle]}>
              <View style={styles.handLeftMint} />
              <View style={styles.handRightMint} />
            </Animated.View>
          </View>

          {/* Character 3: Lavender / Curious Blob */}
          <View style={styles.blobLavender}>
            <Svg width="56" height="50" viewBox="0 0 56 50">
              <Defs>
                <LinearGradient id="lavenderGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={theme.colors.tertiaryFixed} />
                  <Stop offset="50%" stopColor={theme.colors.tertiaryContainer} />
                  <Stop offset="100%" stopColor={theme.colors.tertiary} />
                </LinearGradient>
              </Defs>
              <Path d="M 4 50 C 4 10, 52 10, 52 50 Z" fill="url(#lavenderGrad)" />
              <Circle cx="13" cy="28" r="3" fill={theme.colors.tertiary} opacity="0.3" />
              <Circle cx="43" cy="28" r="3" fill={theme.colors.tertiary} opacity="0.3" />
            </Svg>

            <Animated.View style={[styles.pupilsLavenderContainer, pupilStyle]}>
              <View style={styles.pupilDotLavender} />
              <View style={styles.pupilDotLavender} />
            </Animated.View>

            <Animated.View style={[styles.mouthLavender, smileAnimStyle]}>
              <Svg width="14" height="6" viewBox="0 0 14 6">
                <Path d="M 2 1 Q 7 6 12 1" stroke={theme.colors.surfaceContainerLowest} strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </Svg>
            </Animated.View>

            <Animated.View style={[styles.handsLavender, handsStyle]}>
              <View style={styles.handLeftLavender} />
              <View style={styles.handRightLavender} />
            </Animated.View>
          </View>

          {/* Character 4: Warm Peach Blob */}
          <View style={styles.blobPeach}>
            <Svg width="50" height="42" viewBox="0 0 50 42">
              <Defs>
                <LinearGradient id="peachGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={theme.colors.primaryFixed} />
                  <Stop offset="70%" stopColor={theme.colors.outlineVariant} />
                  <Stop offset="100%" stopColor={theme.colors.primaryFixedDim} />
                </LinearGradient>
              </Defs>
              <Path d="M 4 42 C 4 12, 46 12, 46 42 Z" fill="url(#peachGrad)" />
              <Circle cx="13" cy="26" r="2.5" fill={theme.colors.primary} opacity="0.25" />
              <Circle cx="37" cy="26" r="2.5" fill={theme.colors.primary} opacity="0.25" />
            </Svg>

            <Animated.View style={[styles.pupilsPeachContainer, pupilStyle]}>
              <View style={styles.pupilDot} />
              <View style={styles.pupilDot} />
            </Animated.View>

            <Animated.View style={[styles.mouthPeach, smileAnimStyle]}>
              <Svg width="12" height="5" viewBox="0 0 12 5">
                <Path d="M 1 1 Q 6 5 11 1" stroke={theme.colors.primaryDark} strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </Svg>
            </Animated.View>

            <Animated.View style={[styles.handsPeach, handsStyle]}>
              <View style={styles.handLeftPeach} />
              <View style={styles.handRightPeach} />
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 178,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    top: 4,
    width: 240,
    height: 130,
    borderRadius: 65,
    backgroundColor: theme.colors.primaryFixed,
    opacity: 0.45,
  },
  floatingObjectsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  objCoin: {
    position: 'absolute',
    top: 6,
    left: 14,
  },
  objWallet: {
    position: 'absolute',
    top: 8,
    right: 16,
  },
  objCard: {
    position: 'absolute',
    top: 32,
    left: 64,
  },
  objPiggy: {
    position: 'absolute',
    top: 28,
    right: 66,
  },
  objReceipt: {
    position: 'absolute',
    top: 4,
    left: 144,
  },
  objChart: {
    position: 'absolute',
    top: 40,
    right: 122,
  },
  burstContainer: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 12,
    zIndex: 1,
    marginBottom: -1,
  },
  // Character 1: Pink
  blobPink: {
    width: 54,
    height: 46,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: 3,
  },
  pupilsPinkContainer: {
    position: 'absolute',
    top: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 22,
  },
  pupilDot: {
    width: 5,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.onSurface,
  },
  mouthPink: {
    position: 'absolute',
    top: 26,
  },
  handsPink: {
    position: 'absolute',
    top: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 32,
  },
  handLeft: {
    width: 9,
    height: 11,
    borderRadius: 5,
    backgroundColor: theme.colors.primaryFixed,
    borderWidth: 1,
    borderColor: theme.colors.primaryFixedDim,
  },
  handRight: {
    width: 9,
    height: 11,
    borderRadius: 5,
    backgroundColor: theme.colors.primaryFixed,
    borderWidth: 1,
    borderColor: theme.colors.primaryFixedDim,
  },
  // Character 2: Mint
  blobMint: {
    width: 48,
    height: 38,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: 3,
  },
  pupilsMintContainer: {
    position: 'absolute',
    top: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 18,
  },
  pupilDotMint: {
    width: 4,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.onSurface,
  },
  mouthMint: {
    position: 'absolute',
    top: 21,
  },
  handsMint: {
    position: 'absolute',
    top: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 26,
  },
  handLeftMint: {
    width: 8,
    height: 9,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  handRightMint: {
    width: 8,
    height: 9,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  // Character 3: Lavender
  blobLavender: {
    width: 56,
    height: 50,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: 3,
  },
  pupilsLavenderContainer: {
    position: 'absolute',
    top: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 24,
  },
  pupilDotLavender: {
    width: 5,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceContainerLowest,
  },
  mouthLavender: {
    position: 'absolute',
    top: 27,
  },
  handsLavender: {
    position: 'absolute',
    top: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 32,
  },
  handLeftLavender: {
    width: 9,
    height: 11,
    borderRadius: 5,
    backgroundColor: theme.colors.tertiaryFixed,
  },
  handRightLavender: {
    width: 9,
    height: 11,
    borderRadius: 5,
    backgroundColor: theme.colors.tertiaryFixed,
  },
  // Character 4: Peach
  blobPeach: {
    width: 50,
    height: 42,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: 3,
  },
  pupilsPeachContainer: {
    position: 'absolute',
    top: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 20,
  },
  mouthPeach: {
    position: 'absolute',
    top: 23,
  },
  handsPeach: {
    position: 'absolute',
    top: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 28,
  },
  handLeftPeach: {
    width: 8,
    height: 10,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryFixed,
  },
  handRightPeach: {
    width: 8,
    height: 10,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryFixed,
  },
});
