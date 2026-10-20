import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutUp,
} from 'react-native-reanimated';
import { useAuth, getFriendlyAuthErrorMessage } from '../../src/lib/auth';
import { AuthHero, FocusedField } from '../../src/components/AuthHero';
import {
  EyeIcon,
  EyeOffIcon,
  ArrowForwardIcon,
  PersonOutlineIcon,
} from '../../src/components/Icons';
import { theme } from '../../src/theme';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithPassword, signInAnonymously, hasGuestData } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorTrigger, setErrorTrigger] = useState(0);
  const [successTrigger, setSuccessTrigger] = useState(0);
  const [showComingSoonToast, setShowComingSoonToast] = useState(false);

  const isEmailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const isFormValid = useMemo(() => {
    return isEmailValid && password.length >= 8;
  }, [isEmailValid, password]);

  const handleSignIn = async () => {
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      setErrorTrigger((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!isEmailValid) {
      setErrorMessage('Please enter a valid email address.');
      setErrorTrigger((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      setErrorTrigger((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Check if anonymous session has local guest data
    const hasData = await hasGuestData();
    if (hasData) {
      Alert.alert(
        'Guest Data Notice',
        'You have guest transactions recorded on this device. Signing in to an existing account will switch to that account and your guest data will not be merged into it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In Anyway',
            style: 'destructive',
            onPress: () => performSignIn(),
          },
        ]
      );
      return;
    }

    await performSignIn();
  };

  const performSignIn = async () => {
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await signInWithPassword(email, password);

      setSuccessTrigger((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Smooth transition to tabs
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 350);
    } catch (err: any) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setErrorMessage(friendlyMsg);
      setErrorTrigger((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setIsGuestLoading(true);
      setErrorMessage(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await signInAnonymously();

      setSuccessTrigger((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 300);
    } catch (err: any) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setErrorMessage(friendlyMsg);
      setErrorTrigger((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGuestLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowComingSoonToast(true);
    setTimeout(() => {
      setShowComingSoonToast(false);
    }, 2400);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Coming Soon Floating Toast */}
        {showComingSoonToast && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutUp.duration(200)}
            style={[styles.toastContainer, { top: insets.top + 10 }]}
          >
            <Text style={styles.toastText}>Password reset is coming soon!</Text>
          </Animated.View>
        )}

        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmark}>Putu</Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaBadgeText}>BETA</Text>
            </View>
          </View>
          <Text style={styles.tagline}>Mindful Rupee Tracking</Text>
        </View>

        {/* Interactive Avatars & Floating Stage */}
        <AuthHero
          errorTrigger={errorTrigger}
          successTrigger={successTrigger}
        />

        {/* Primary Elevated Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>
              Enter your details to access your sanctuary.
            </Text>
          </View>

          {/* Inline Friendly Error */}
          {errorMessage && (
            <Animated.View entering={FadeInUp.duration(200)} style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </Animated.View>
          )}

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                ]}
                placeholder="name@example.com"
                placeholderTextColor={theme.colors.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    focusedField === 'password' && styles.inputFocused,
                  ]}
                  placeholder="••••••••••••"
                  placeholderTextColor={theme.colors.secondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowPassword((prev) => !prev);
                  }}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOffIcon size={20} color={theme.colors.secondary} />
                  ) : (
                    <EyeIcon size={20} color={theme.colors.secondary} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Forgot password */}
              <View style={styles.forgotPasswordRow}>
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={isLoading || isGuestLoading}
              activeOpacity={0.88}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.primaryButtonText}>Sign in</Text>
                  <ArrowForwardIcon size={18} color={theme.colors.white} />
                </View>
              )}
            </TouchableOpacity>

            {/* Centered Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Secondary Continue as Guest */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestSignIn}
              disabled={isLoading || isGuestLoading}
              activeOpacity={0.85}
            >
              {isGuestLoading ? (
                <ActivityIndicator size="small" color={theme.colors.onSurface} />
              ) : (
                <View style={styles.buttonContent}>
                  <PersonOutlineIcon size={18} color={theme.colors.secondary} />
                  <Text style={styles.guestButtonText}>Continue as guest</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Footer Navigation Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>New here? </Text>
              <TouchableOpacity
                onPress={() => router.replace('/(auth)/sign-up')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Create an account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.margin,
    justifyContent: 'space-between',
  },
  toastContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
    backgroundColor: theme.colors.slateDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radii.pill,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -0.6,
  },
  betaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryFixed,
  },
  betaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  tagline: {
    fontSize: 13,
    color: theme.colors.secondary,
    marginTop: 2,
    fontWeight: '500',
  },
  cardContainer: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    marginTop: 6,
    ...theme.shadows.card,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 4,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: theme.colors.roseLight,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radii.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '600',
    lineHeight: 18,
  },
  formContainer: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginLeft: 2,
  },
  input: {
    height: 48,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 16,
    fontSize: 15,
    color: theme.colors.onSurface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputFocused: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderColor: theme.colors.primary,
  },
  passwordInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  primaryButton: {
    height: 50,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.white,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  guestButton: {
    height: 48,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
