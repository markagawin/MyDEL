import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  LinkingOptions,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Animated, StyleSheet, Text } from 'react-native';

import { AppDataProvider, useAppData } from './src/AppDataContext';
import QuickLogScreen from './src/screens/QuickLogScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SplashScreen from './src/components/SplashScreen';
import UpdateBanner from './src/components/UpdateBanner';
import { ThemeProvider, useIsDarkTheme, useTheme } from './src/theme';

const MIN_SPLASH_MS = 2000;
const SPLASH_FADE_MS = 500;

// Without an explicit linking config, React Navigation's web integration keeps the URL in
// sync when navigating inside the app (hence tab bar hrefs working), but does NOT read the
// URL to pick an initial screen on load for a nested Stack > Tab structure — it silently
// falls back to each navigator's default screen. This config makes deep links (manifest
// shortcuts, a bookmarked tab) actually land on the right screen.
//
// `prefixes` is for scheme/host prefixes, not a bare path segment — it can't express GitHub
// Pages' subpath hosting (/MyDEL/...). The path has to be baked into each screen's pattern
// instead. Since the dev server serves the same source at the domain root (no /MyDEL/
// segment), the prefix is derived at runtime from the current URL rather than hardcoded, so
// both environments resolve correctly.
const BASE_PATH =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/MyDEL')
    ? 'MyDEL/'
    : '';

const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: [],
  config: {
    screens: {
      Tabs: {
        screens: {
          QuickLog: `${BASE_PATH}Tabs/QuickLog`,
          History: `${BASE_PATH}Tabs/History`,
          Summary: `${BASE_PATH}Tabs/Summary`,
        },
      },
      Settings: `${BASE_PATH}Settings`,
    },
  },
};

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

const TAB_ICONS: Record<string, string> = {
  QuickLog: '➕',
  History: '📜',
  Summary: '📊',
};

function Tabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.navy,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="QuickLog" component={QuickLogScreen} options={{ title: 'Quick Log' }} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Summary" component={SummaryScreen} />
    </Tab.Navigator>
  );
}

function AppInner() {
  const theme = useTheme();
  const isDark = useIsDarkTheme();
  const { loading } = useAppData();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = !loading && minTimeElapsed;

  useEffect(() => {
    if (ready) {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: SPLASH_FADE_MS,
        useNativeDriver: true,
      }).start();
      const timer = setTimeout(() => setShowSplash(false), SPLASH_FADE_MS);
      return () => clearTimeout(timer);
    }
  }, [ready]);

  const navigationTheme = {
    ...(isDark ? NavigationDarkTheme : NavigationDefaultTheme),
    colors: {
      ...(isDark ? NavigationDarkTheme : NavigationDefaultTheme).colors,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.navy,
    },
  };

  return (
    <>
      {ready && (
        <NavigationContainer theme={navigationTheme} linking={linking}>
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Tabs" component={Tabs} />
            <RootStack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings', presentation: 'modal' }}
            />
          </RootStack.Navigator>
        </NavigationContainer>
      )}
      {showSplash && (
        <Animated.View
          pointerEvents={ready ? 'none' : 'auto'}
          style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}
        >
          <SplashScreen />
        </Animated.View>
      )}
      {ready && <UpdateBanner />}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppDataProvider>
            <AppInner />
          </AppDataProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
