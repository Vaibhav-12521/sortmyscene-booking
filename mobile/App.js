import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import EventsScreen from './src/screens/EventsScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.accent },
};

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { color: colors.ink, fontWeight: '800' },
  headerTintColor: colors.accent,
  contentStyle: { backgroundColor: colors.bg },
};

function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {user ? (
        <>
          <Stack.Screen name="Events" component={EventsScreen} options={{ title: 'Upcoming events' }} />
          <Stack.Screen
            name="EventDetail"
            component={EventDetailScreen}
            options={({ route }) => ({ title: route.params?.name || 'Select seats' })}
          />
          <Stack.Screen name="Bookings" component={MyBookingsScreen} options={{ title: 'My tickets' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
