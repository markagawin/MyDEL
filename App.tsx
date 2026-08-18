import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

import { AppDataProvider } from './src/AppDataContext';
import QuickLogScreen from './src/screens/QuickLogScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { theme } from './src/theme';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

const TAB_ICONS: Record<string, string> = {
  QuickLog: '➕',
  History: '📜',
  Summary: '📊',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.navy,
        tabBarInactiveTintColor: '#9AA5B8',
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="QuickLog" component={QuickLogScreen} options={{ title: 'Quick Log' }} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Summary" component={SummaryScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppDataProvider>
          <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="Tabs" component={Tabs} />
              <RootStack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ headerShown: true, title: 'Settings', presentation: 'modal' }}
              />
            </RootStack.Navigator>
          </NavigationContainer>
          <StatusBar style="auto" />
        </AppDataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
