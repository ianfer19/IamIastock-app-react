import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import { Jost_500Medium } from '@expo-google-fonts/jost';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { SyncScreen } from '@/features/pos/screens/SyncScreen';
import { DashboardScreen } from '@/features/pos/screens/DashboardScreen';
import { CheckoutScreen } from '@/features/pos/screens/CheckoutScreen';
import { useTheme } from '@/core/theme/theme';
import { SecureStorage, SECURE_KEYS } from '@/core/storage/secureStorage';
import { authEventEmitter } from '@/core/api/client';
import { StatusModalProvider } from '@/core/context/StatusModalContext';
import { Provider } from 'react-redux';
import { store } from '@/core/store/store';
import { setAuth } from '@/core/store/slices/authSlice';
import { setSelectedRegister } from '@/core/store/slices/posSlice';
import { NotificationContainer } from '@/presentation/components/NotificationContainer';
import { OmniChatScreen } from '@/features/chat/screens/OmniChatScreen';

const navigationRef = createNavigationContainerRef();
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

function AppContent() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialRoute, setInitialRoute] = useState('LOGIN');
  const [statusBarStyle, setStatusBarStyle] = useState<'light' | 'dark'>('light');
  const { mode, colors } = useTheme();

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
    'Inter-Black': Inter_900Black,
    'Jost-Medium': Jost_500Medium,
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
  });

  // Setup Global Logout Listener
  useEffect(() => {
    authEventEmitter.onLogout = () => {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'LOGIN' }],
        });
      }
    };
  }, []);

  // Initial Session Check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await SecureStorage.getToken(SECURE_KEYS.ACCESS_TOKEN);
        const user = await SecureStorage.getUser();
        if (token && user) {
          console.log('✅ [App] Session found. Hydrating Redux & Auto-logging in...');
          store.dispatch(setAuth({ user, tenantId: user.tenant_id }));
          
          // Hydrate cash register selection if any
          const savedRegister = await SecureStorage.getCashRegister();
          if (savedRegister) {
            console.log('✅ [App] Persisted cash register found:', savedRegister);
            store.dispatch(setSelectedRegister(savedRegister));
          }
          
          setInitialRoute('SYNC');
          setStatusBarStyle('dark');
        }
      } catch (e) {
        console.error('Error checking session', e);
      } finally {
        setIsInitializing(false);
      }
    };

    if (fontsLoaded) {
      checkSession();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || isInitializing) {
    return null;
  }

  // Computed status bar style based on theme and route
  const computedStatusBarStyle = mode === 'dark' ? 'light' : statusBarStyle;

  return (
    <SafeAreaProvider>
      <StatusModalProvider>
        <GestureHandlerRootView style={styles.flex}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={computedStatusBarStyle} translucent />
            <NavigationContainer
              ref={navigationRef}
              onStateChange={() => {
                const currentRouteName = (navigationRef.getCurrentRoute() as any)?.name;
                setStatusBarStyle(currentRouteName === 'LOGIN' ? 'light' : 'dark');
              }}
            >
              <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }}
              >
                <Stack.Screen name="LOGIN">
                  {(props) => <LoginScreen {...props} onLogin={() => props.navigation.replace('SYNC')} />}
                </Stack.Screen>
                <Stack.Screen name="SYNC">
                  {(props) => <SyncScreen {...props} onComplete={() => props.navigation.replace('DASHBOARD')} />}
                </Stack.Screen>
                <Stack.Screen name="DASHBOARD" options={{ gestureEnabled: false }}>
                  {(props) => <DashboardScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="CHECKOUT">
                  {(props) => (
                    <CheckoutScreen
                      {...props}
                      onBack={() => props.navigation.goBack()}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="OMNICHAT">
                  {(props) => (
                    <OmniChatScreen
                      {...props}
                      onBack={() => props.navigation.goBack()}
                    />
                  )}
                </Stack.Screen>
              </Stack.Navigator>
            </NavigationContainer>
            <NotificationContainer />
          </View>
        </GestureHandlerRootView>
      </StatusModalProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
