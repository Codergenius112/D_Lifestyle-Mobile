import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';

// Auth
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

// Main tabs
import HomeScreen from '../screens/main/HomeScreen';
import DiscoverScreen from '../screens/main/DiscoverScreen';
import BookingsScreen from '../screens/main/BookingsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Events
import EventDetailsScreen from '../screens/events/EventDetailsScreen';

// Booking flow
import BookingFlowScreen from '../screens/bookings/BookingFlowScreen';
import GroupBookingScreen from '../screens/bookings/GroupBookingScreen';

// Apartments
import ApartmentListScreen from '../screens/apartments/ApartmentListScreen';
import ApartmentDetailsScreen from '../screens/apartments/ApartmentDetailsScreen';
import ApartmentBookingScreen from '../screens/apartments/ApartmentBookingScreen';

// Cars (separate files, matching original structure)
import CarListScreen from '../screens/cars/CarListScreen';
import CarDetailsScreen from '../screens/cars/CarDetailsScreen';
import CarBookingScreen from '../screens/cars/CarBookingScreen';

// Other
import PaymentScreen from '../screens/payments/PaymentScreen';
import TicketScreen from '../screens/tickets/TicketScreen';
import QueueScreen from '../screens/queue/QueueScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import EmergencySOSScreen from '../screens/safety/EmergencySOSScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="BookingFlow" component={BookingFlowScreen} />
      <Stack.Screen name="GroupBooking" component={GroupBookingScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Ticket" component={TicketScreen} />
      <Stack.Screen name="ApartmentList" component={ApartmentListScreen} />
      <Stack.Screen name="ApartmentDetails" component={ApartmentDetailsScreen} />
      <Stack.Screen name="ApartmentBooking" component={ApartmentBookingScreen} />
      <Stack.Screen name="CarList" component={CarListScreen} />
      <Stack.Screen name="CarDetails" component={CarDetailsScreen} />
      <Stack.Screen name="CarBooking" component={CarBookingScreen} />
      <Stack.Screen name="Queue" component={QueueScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
    </Stack.Navigator>
  );
}

function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiscoverMain" component={DiscoverScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="ApartmentList" component={ApartmentListScreen} />
      <Stack.Screen name="ApartmentDetails" component={ApartmentDetailsScreen} />
      <Stack.Screen name="ApartmentBooking" component={ApartmentBookingScreen} />
      <Stack.Screen name="CarList" component={CarListScreen} />
      <Stack.Screen name="CarDetails" component={CarDetailsScreen} />
      <Stack.Screen name="CarBooking" component={CarBookingScreen} />
      <Stack.Screen name="BookingFlow" component={BookingFlowScreen} />
      <Stack.Screen name="GroupBooking" component={GroupBookingScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Ticket" component={TicketScreen} />
      <Stack.Screen name="Queue" component={QueueScreen} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookingsMain" component={BookingsScreen} />
      <Stack.Screen name="Ticket" component={TicketScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="GroupBooking" component={GroupBookingScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="ApartmentDetails" component={ApartmentDetailsScreen} />
      <Stack.Screen name="ApartmentBooking" component={ApartmentBookingScreen} />
      <Stack.Screen name="CarDetails" component={CarDetailsScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EmergencySOS" component={EmergencySOSScreen} />
      <Stack.Screen name="ApartmentList" component={ApartmentListScreen} />
      <Stack.Screen name="ApartmentDetails" component={ApartmentDetailsScreen} />
      <Stack.Screen name="ApartmentBooking" component={ApartmentBookingScreen} />
      <Stack.Screen name="CarList" component={CarListScreen} />
      <Stack.Screen name="CarDetails" component={CarDetailsScreen} />
      <Stack.Screen name="CarBooking" component={CarBookingScreen} />
      <Stack.Screen name="Queue" component={QueueScreen} />
      <Stack.Screen name="Bookings" component={BookingsScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#f5dd4b',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [any, any]> = {
            Home:     ['home',     'home-outline'],
            Discover: ['compass',  'compass-outline'],
            Bookings: ['calendar', 'calendar-outline'],
            Profile:  ['person',   'person-outline'],
          };
          const [filled, outline] = icons[route.name] ?? ['home', 'home-outline'];
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeStack} />
      <Tab.Screen name="Discover" component={DiscoverStack} />
      <Tab.Screen name="Bookings" component={BookingsStack} />
      <Tab.Screen name="Profile"  component={ProfileStack} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useStore((state) => Boolean(state.isAuthenticated));
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0a0a0a',
    borderTopColor: '#1a1a1a',
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});