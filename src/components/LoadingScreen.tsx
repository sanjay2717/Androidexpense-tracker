import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { theme } from '../theme';

interface LoadingScreenProps {
  isReady: boolean;
  onFinish?: () => void;
}

export function LoadingScreen({ isReady, onFinish }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);

  // Scale and opacity for entrance
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  // Pulse for ambient radial glow
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.12);

  // Progress bar width
  const progress = useSharedValue(25);

  useEffect(() => {
    // Entrance animation
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 500 });

    // Breathing glow
    glowScale.value = withRepeat(
      withTiming(1.2, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withTiming(0.24, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Initial progress bar animation
    progress.value = withTiming(75, { duration: 1200, easing: Easing.out(Easing.quad) });
  }, [scale, opacity, glowScale, glowOpacity, progress]);

  // When ready (fonts loaded & anonymous session established), complete progress and fade out
  useEffect(() => {
    if (isReady) {
      progress.value = withTiming(100, { duration: 250 });
      const fadeTimer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 350 });
        const unmountTimer = setTimeout(() => {
          setVisible(false);
          onFinish?.();
        }, 380);
        return () => clearTimeout(unmountTimer);
      }, 250);
      return () => clearTimeout(fadeTimer);
    }
  }, [isReady, progress, opacity, onFinish]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, animatedContainerStyle]}>
      {/* Center Branded Mark with Ambient Halo */}
      <View style={styles.centerContainer}>
        {/* Soft Ambient Radial Pink Halo */}
        <Animated.View style={[styles.ambientGlow, animatedGlowStyle]} />

        {/* Brand Text */}
        <Text style={styles.logoText}>Putu</Text>
      </View>

      {/* Sleek bottom loading indicator */}
      <View style={styles.bottomBarWrapper}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
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
    backgroundColor: '#FAFAFC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 240,
  },
  ambientGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FF2D78',
  },
  logoText: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FF2D78',
    letterSpacing: -1.8,
    textShadowColor: 'rgba(255, 45, 120, 0.28)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 18,
  },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
    width: '100%',
  },
  progressBarTrack: {
    width: 90,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FF2D78',
  },
});
