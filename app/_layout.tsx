import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// Reanimated 3.16+ strict-mode logger configuration:
// Per Reanimated official documentation, strict: false disables development-mode warnings
// for render-phase mutable access from external libraries (like @shopify/react-native-skia reconciler)
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { LoadingProvider, useLoading } from '../src/context/LoadingContext';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { queryClient } from '../src/lib/queryClient';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { theme } from '../src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent native splash screen from hiding prematurely
SplashScreen.preventAutoHideAsync().catch(() => {});

import { getRouteRedirect } from '../src/lib/routeGate';

function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const { isPermanentUser, isAnonymous, isGuestActive, session, user, isLoading: isAuthLoading, isUpgrading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { isLoadingVisible, loadingKey, handleLoadingFinish } = useLoading();

  // Immediately release the native OS splash screen so Putu's branded loading screen is visible
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const hasSession = Boolean(session || user || isGuestActive);
  const isAnon = Boolean(isAnonymous || isGuestActive);

  // Route gating: redirect based on auth status using pure route gate
  useEffect(() => {
    if (isAuthLoading) return;

    const targetRedirect = getRouteRedirect({
      hasSession,
      isAnonymous: isAnon,
      isUpgrading,
      segments,
    });

    if (targetRedirect) {
      router.replace(targetRedirect as any);
    }
  }, [hasSession, isAnon, isAuthLoading, isUpgrading, segments, router]);

  useEffect(() => {
    if (fontError) {
      console.warn('Font loading error:', fontError);
    }
  }, [fontError]);

  // Branded splash stays until fonts AND the session restore finish
  const isAppReady = (fontsLoaded || !!fontError) && !isAuthLoading;

  return (
    <>
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Protected guard={hasSession}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="upgrade-sync"
            options={{
              headerShown: false,
              gestureEnabled: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="add"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Settings',
              headerStyle: { backgroundColor: theme.colors.surfaceContainerLowest },
              headerTintColor: theme.colors.onSurface,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
        </Stack.Protected>
      </Stack>

      {/* Branded loading screen remains until fonts and auth session restore complete */}
      {isLoadingVisible && (
        <LoadingScreen
          key={loadingKey}
          isReady={isAppReady}
          onFinish={handleLoadingFinish}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LoadingProvider>
            <RootLayoutContent />
          </LoadingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
