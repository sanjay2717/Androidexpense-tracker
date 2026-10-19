import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';

import { LoadingProvider, useLoading } from '../src/context/LoadingContext';
import { initializeAuthSession } from '../src/lib/supabase';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { theme } from '../src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent native splash screen from hiding prematurely
SplashScreen.preventAutoHideAsync().catch(() => {});

// Initialize TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 2,
    },
  },
});

function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const [sessionInitialized, setSessionInitialized] = useState(false);
  const { isLoadingVisible, loadingKey, handleLoadingFinish } = useLoading();

  // Immediately release the native OS splash screen so Putu's branded loading screen is visible
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Initialize anonymous session on app start
  useEffect(() => {
    async function init() {
      try {
        await initializeAuthSession();
      } catch (e) {
        console.warn('Auth initialization warning:', e);
      } finally {
        setSessionInitialized(true);
      }
    }
    init();
  }, []);

  // Safety timer: ensures app never stays stuck on loading if network or fonts hang
  useEffect(() => {
    const timer = setTimeout(() => {
      setSessionInitialized(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontError) {
      console.warn('Font loading error:', fontError);
    }
  }, [fontError]);

  const isAppReady = (fontsLoaded || !!fontError) && sessionInitialized;

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Add Transaction',
            headerStyle: { backgroundColor: theme.colors.surfaceContainerLowest },
            headerTintColor: theme.colors.onSurface,
            headerTitleStyle: { fontWeight: '700' },
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
      </Stack>

      {/* Loading Screen with 2D Zen character, Reanimated physics and random 2-3s duration */}
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
        <LoadingProvider>
          <RootLayoutContent />
        </LoadingProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
});
