import { router } from 'expo-router';

/**
 * Safely navigates back if there is a screen in the navigation stack history.
 * Otherwise falls back to replacing with the designated fallback route (default: '/(tabs)').
 * On auth screens, fallback should be '/(auth)/sign-in'.
 */
export function safeBack(fallback: string = '/(tabs)'): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
}
