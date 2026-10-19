import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Circle,
  Ellipse,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import {
  AvatarMeditate,
  AvatarPeekLeft,
  AvatarPeekRight,
} from './AvatarIllustrations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LoadingScreenProps {
  isReady: boolean;
  onFinish?: () => void;
}

export function LoadingScreen({ isReady, onFinish }: LoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);

  // 1. Random duration between 2000ms and 3000ms (2 to 3 seconds)
  const [randomDuration] = useState(() => Math.floor(Math.random() * 1000) + 2000);

  // Animation values
  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.96);

  // Zen character floating
  const zenFloatY = useSharedValue(0);
  const sparkScale = useSharedValue(1);
  const sparkRotate = useSharedValue(0);

  // Peeking characters
  const leftPeekX = useSharedValue(-50);
  const leftBobY = useSharedValue(0);
  const rightPeekX = useSharedValue(50);
  const rightBobY = useSharedValue(0);

  // Pencil sketching animation
  const pencilX = useSharedValue(0);
  const pencilRotate = useSharedValue(-26);

  // Progress bar
  const progressPercent = useSharedValue(0);

  useEffect(() => {
    // Container entrance
    containerOpacity.value = withTiming(1, { duration: 400 });
    containerScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });

    // Zen character gentle floating
    zenFloatY.value = withRepeat(
      withTiming(-8, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Spark twinkle animation
    sparkScale.value = withRepeat(
      withTiming(1.22, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    sparkRotate.value = withRepeat(
      withTiming(20, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Left peeking character
    leftPeekX.value = withDelay(
      200,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.back(1.5)) })
    );
    leftBobY.value = withDelay(
      900,
      withRepeat(
        withTiming(-5, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    // Right peeking character
    rightPeekX.value = withDelay(
      350,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.back(1.5)) })
    );
    rightBobY.value = withDelay(
      1050,
      withRepeat(
        withTiming(-5, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    // Pencil drawing motion across underline
    pencilX.value = withRepeat(
      withSequence(
        withTiming(110, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
    pencilRotate.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
        withTiming(-28, { duration: 1600, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );

    // Progress bar fills over the exact random 2-3s duration
    progressPercent.value = withTiming(100, {
      duration: randomDuration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // Dismiss screen after random duration + smooth fade-out
    const completionTimer = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 380 });
      const unmountTimer = setTimeout(() => {
        setVisible(false);
        onFinish?.();
      }, 400);

      return () => clearTimeout(unmountTimer);
    }, randomDuration);

    return () => clearTimeout(completionTimer);
  }, [
    randomDuration,
    containerOpacity,
    containerScale,
    zenFloatY,
    sparkScale,
    sparkRotate,
    leftPeekX,
    leftBobY,
    rightPeekX,
    rightBobY,
    pencilX,
    pencilRotate,
    progressPercent,
    onFinish,
  ]);

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const animatedZenStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: zenFloatY.value }],
  }));

  const animatedSparkStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: sparkScale.value },
      { rotate: `${sparkRotate.value}deg` },
    ],
  }));

  const animatedLeftPeekStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: leftPeekX.value },
      { translateY: leftBobY.value },
    ],
  }));

  const animatedRightPeekStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: rightPeekX.value },
      { translateY: rightBobY.value },
    ],
  }));

  const animatedPencilStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pencilX.value },
      { rotate: `${pencilRotate.value}deg` },
    ],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressPercent.value}%`,
  }));

  const animatedBeadStyle = useAnimatedStyle(() => ({
    left: `${Math.max(0, Math.min(progressPercent.value, 97))}%`,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, animatedContainerStyle]}>
      {/* Ambient background glows */}
      <View style={styles.topAmbientGlow} />
      <View style={styles.bottomAmbientGlow} />

      {/* LEFT PEAKING CHARACTER (Cropped by left screen edge) */}
      <Animated.View style={[styles.leftCharacterContainer, animatedLeftPeekStyle]}>
        <AvatarPeekLeft width={54} height={72} />
      </Animated.View>

      {/* RIGHT PEAKING CHARACTER (Cropped by right screen edge) */}
      <Animated.View style={[styles.rightCharacterContainer, animatedRightPeekStyle]}>
        <AvatarPeekRight width={54} height={72} />
      </Animated.View>

      {/* UPPER RIGHT ANNOTATION */}
      <View style={[styles.upperRightAnnotation, { top: insets.top + 28 }]}>
        <View style={styles.annotationRow}>
          <Text style={styles.annotationDot}>●</Text>
          <Text style={styles.annotationCurrency}>₹</Text>
          <Text style={styles.annotationText}>budget safe</Text>
          <Text style={styles.annotationSpark}>✨</Text>
        </View>
        <Svg width={46} height={20} viewBox="0 0 60 30" fill="none" style={styles.annotationArrow}>
          <Path
            d="M8 6 C24 8, 48 11, 49 22"
            stroke="#FF2D78"
            strokeOpacity={0.65}
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeWidth={1.8}
          />
          <Path
            d="M44 18 L50 23 L53 16"
            stroke="#FF2D78"
            strokeOpacity={0.65}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
          />
        </Svg>
      </View>

      {/* MAIN CONTENT COLUMN */}
      <View style={[styles.contentColumn, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
        {/* TOP SECTION: Zen Meditating Character (Lotus pose with coral bird on head) */}
        <Animated.View style={[styles.zenWrapper, animatedZenStyle]}>
          {/* Ambient Glow behind Character */}
          <View style={styles.zenHalo} />

          <AvatarMeditate width={116} height={116} />
        </Animated.View>

        {/* CENTER FOCAL: Putu Title + Underline + Active Sketching Pencil */}
        <View style={styles.centerBrandContainer}>
          {/* Subtle Pink Aura */}
          <View style={styles.brandAura} />

          <Text style={styles.brandTitle}>Putu</Text>

          {/* Underline Stroke Area */}
          <View style={styles.underlineTrack}>
            <Svg width={180} height={24} viewBox="0 0 176 28" fill="none">
              <Path
                d="M6 14 C48 5, 126 5, 170 12"
                stroke="#FF2D78"
                strokeLinecap="round"
                strokeWidth={3.4}
              />
              <Path
                d="M28 20 C64 16, 120 16, 154 18"
                stroke="#FFA382"
                strokeOpacity={0.6}
                strokeLinecap="round"
                strokeWidth={2}
              />
            </Svg>

            {/* Hand Holding Pencil Moving along the stroke */}
            <Animated.View style={[styles.pencilWrapper, animatedPencilStyle]}>
              <Svg width={48} height={48} viewBox="0 0 80 80" fill="none">
                <G transform="rotate(-38 32 36)">
                  <Rect
                    x={28}
                    y={2}
                    width={6.5}
                    height={42}
                    rx={3.2}
                    fill="#FFFFFF"
                    stroke="#232127"
                    strokeWidth={1.8}
                  />
                  <Rect x={28} y={34} width={6.5} height={3} fill="#FF2D78" />
                  <Path d="M28 44 L31.25 53 L34.5 44 Z" fill="#232127" />
                  <Circle cx={31.25} cy={53} r={1.3} fill="#FF2D78" />
                </G>
                {/* Hand silhouette */}
                <Path
                  d="M42 38 C42 34 37 32 33 34 C29 36 29 41 33 43 C37 45 42 43 42 38 Z"
                  fill="#FAF8F5"
                  stroke="#232127"
                  strokeLinecap="round"
                  strokeWidth={2}
                />
                <Path
                  d="M48 44 C48 39 43 38 38 41 C35 43 36 48 41 49 C46 50 48 48 48 44 Z"
                  fill="#FAF8F5"
                  stroke="#232127"
                  strokeLinecap="round"
                  strokeWidth={2}
                />
                <Ellipse cx={34} cy={40} rx={2.5} ry={1.8} fill="#FF2D78" opacity={0.55} />
              </Svg>
            </Animated.View>
          </View>

          {/* Subtitle */}
          <Text style={styles.brandSubtitle}>KINETIC FINANCE</Text>
        </View>

        {/* BOTTOM SECTION: Intention quote & Liquid loader */}
        <View style={styles.bottomSection}>
          {/* Mindful Daily Intention Quote */}
          <View style={styles.quoteCard}>
            <View style={styles.quoteContent}>
              <Text style={styles.quoteText}>“remember: spend on what brings joy ✨”</Text>
              <View style={styles.quoteAuthorRow}>
                <Text style={styles.quoteAuthor}>~ daily intention</Text>
                <Svg width={30} height={8} viewBox="0 0 42 10" fill="none" style={styles.squiggle}>
                  <Path
                    d="M2 5 C8 1, 14 9, 20 5 C26 1, 32 9, 40 5"
                    stroke="#FF2D78"
                    strokeOpacity={0.7}
                    strokeLinecap="round"
                    strokeWidth={1.6}
                  />
                </Svg>
              </View>
            </View>

            {/* Glowing Hand-Drawn Heart */}
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" style={styles.heartIcon}>
              <Path
                d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"
                stroke="#FF2D78"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          {/* Liquid Animated Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
              <Animated.View style={[styles.progressBead, animatedBeadStyle]} />
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAF8F5',
    zIndex: 99999,
  },
  topAmbientGlow: {
    position: 'absolute',
    top: '15%',
    left: '25%',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 45, 120, 0.08)',
  },
  bottomAmbientGlow: {
    position: 'absolute',
    bottom: '15%',
    right: '10%',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 163, 130, 0.07)',
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  leftCharacterContainer: {
    position: 'absolute',
    left: -2,
    top: '26%',
    zIndex: 40,
  },
  rightCharacterContainer: {
    position: 'absolute',
    right: -2,
    top: '52%',
    zIndex: 40,
  },
  upperRightAnnotation: {
    position: 'absolute',
    right: 18,
    alignItems: 'flex-end',
    transform: [{ rotate: '4deg' }],
    zIndex: 30,
  },
  annotationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  annotationDot: {
    fontSize: 10,
    color: '#FF2D78',
    marginRight: 2,
  },
  annotationCurrency: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  annotationText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#2A2930',
  },
  annotationSpark: {
    fontSize: 14,
  },
  annotationArrow: {
    marginTop: 2,
    marginRight: 12,
  },
  zenWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  zenHalo: {
    position: 'absolute',
    top: -8,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 45, 120, 0.12)',
  },
  sparkleContainer: {
    position: 'absolute',
    top: -2,
    zIndex: 2,
  },
  centerBrandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 'auto',
  },
  brandAura: {
    position: 'absolute',
    width: 220,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 45, 120, 0.09)',
  },
  brandTitle: {
    fontSize: 78,
    fontWeight: '800',
    color: '#FF2D78',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(255, 45, 120, 0.28)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
  underlineTrack: {
    width: 180,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  pencilWrapper: {
    position: 'absolute',
    top: -22,
    left: 20,
  },
  brandSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#9E9AA6',
    letterSpacing: 3.5,
    marginTop: 6,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
    marginBottom: 26,
    paddingHorizontal: 8,
  },
  quoteContent: {
    flex: 1,
  },
  quoteText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#28272E',
    lineHeight: 20,
  },
  quoteAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  quoteAuthor: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#FF2D78',
    fontStyle: 'italic',
  },
  squiggle: {
    marginLeft: 6,
  },
  heartIcon: {
    marginLeft: 12,
  },
  progressContainer: {
    width: 180,
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTrack: {
    width: 180,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EBE7E1',
    position: 'relative',
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FF2D78',
  },
  progressBead: {
    position: 'absolute',
    top: -2.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FF2D78',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
});
