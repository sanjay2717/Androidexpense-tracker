export interface RouteGateParams {
  hasSession: boolean;
  isAnonymous: boolean;
  isUpgrading: boolean;
  segments: readonly string[] | string[];
}

/**
 * Pure route gate logic for Putu.
 * Determines if a navigation redirect is required based on the user's session state and current route segments.
 * Returns null if the current route is allowed, or a route string (e.g. '/(auth)/sign-in' or '/(tabs)') to redirect to.
 */
export function getRouteRedirect({
  hasSession,
  isAnonymous,
  isUpgrading,
  segments,
}: RouteGateParams): string | null {
  // Rule: isUpgrading true, any route -> no redirect
  if (isUpgrading) {
    return null;
  }

  const rootSegment = segments[0];
  const inAuthGroup = rootSegment === '(auth)';
  const onUpgradeSync = rootSegment === 'upgrade-sync';

  // Rule: no session, any route -> go to /(auth)/sign-in; /(auth)/* allowed
  if (!hasSession) {
    if (inAuthGroup) {
      return null;
    }
    return '/(auth)/sign-in';
  }

  // Rule: anonymous session
  // - on /(auth)/sign-up -> ALLOW (upgrade mode)
  // - on /(auth)/sign-in -> ALLOW (shows the "guest data won't merge" warning)
  // - on /(tabs)/*, /profile, /settings, /add -> ALLOW
  // - on /upgrade-sync -> ALLOW
  if (isAnonymous) {
    return null;
  }

  // Rule: permanent session (hasSession && !isAnonymous)
  // - on /upgrade-sync -> ALLOW
  // - on /(tabs)/*, /profile, /settings, /add -> ALLOW
  // - on /(auth)/* -> redirect to /(tabs), unless isUpgrading (handled above)
  if (inAuthGroup) {
    return '/(tabs)';
  }

  return null;
}
