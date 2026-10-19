import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { HomeIcon, WalletIcon, PlusIcon, CalendarIcon, ChartIcon } from './Icons';
import { theme } from '../theme';

export interface CustomTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  descriptors?: Record<string, any>;
  navigation: {
    emit: (event: any) => any;
    navigate: (name: string, params?: any) => void;
  };
}

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);

  const handleTabPress = (route: any, isFocused: boolean) => {
    // Light haptics on taps
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/add' as any);
  };

  // Find routes
  const homeRoute = state.routes.find((r) => r.name === 'index');
  const walletRoute = state.routes.find((r) => r.name === 'wallet');
  const planningRoute = state.routes.find((r) => r.name === 'planning');
  const reportRoute = state.routes.find((r) => r.name === 'report');

  const currentRouteName = state.routes[state.index]?.name;

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { height: 60 + bottomInset, paddingBottom: bottomInset }]}>
        {/* 1. Home Tab */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: currentRouteName === 'index' }}
          onPress={() => homeRoute && handleTabPress(homeRoute, currentRouteName === 'index')}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <HomeIcon
            size={22}
            color={currentRouteName === 'index' ? theme.colors.primary : theme.colors.secondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: currentRouteName === 'index' ? theme.colors.primary : theme.colors.secondary },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* 2. Wallet Tab */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: currentRouteName === 'wallet' }}
          onPress={() => walletRoute && handleTabPress(walletRoute, currentRouteName === 'wallet')}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <WalletIcon
            size={22}
            color={currentRouteName === 'wallet' ? theme.colors.primary : theme.colors.secondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: currentRouteName === 'wallet' ? theme.colors.primary : theme.colors.secondary },
            ]}
          >
            Wallet
          </Text>
        </TouchableOpacity>

        {/* 3. Raised Centered Pink "+" Button */}
        <View style={styles.raisedButtonWrapper}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add Expense"
            onPress={handleAddPress}
            style={styles.raisedButton}
            activeOpacity={0.88}
          >
            <PlusIcon size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* 4. Planning Tab */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: currentRouteName === 'planning' }}
          onPress={() => planningRoute && handleTabPress(planningRoute, currentRouteName === 'planning')}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <CalendarIcon
            size={22}
            color={currentRouteName === 'planning' ? theme.colors.primary : theme.colors.secondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: currentRouteName === 'planning' ? theme.colors.primary : theme.colors.secondary },
            ]}
          >
            Planning
          </Text>
        </TouchableOpacity>

        {/* 5. Report Tab */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: currentRouteName === 'report' }}
          onPress={() => reportRoute && handleTabPress(reportRoute, currentRouteName === 'report')}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <ChartIcon
            size={22}
            color={currentRouteName === 'report' ? theme.colors.primary : theme.colors.secondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: currentRouteName === 'report' ? theme.colors.primary : theme.colors.secondary },
            ]}
          >
            Report
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    height: 48,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.1,
  },
  raisedButtonWrapper: {
    position: 'relative',
    top: -16,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raisedButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e40a65',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 8,
  },
});
