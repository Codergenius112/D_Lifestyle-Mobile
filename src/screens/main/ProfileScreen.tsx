import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarlightBackground from '../../components/StarlightBackground';
import { useStore } from '../../store/useStore';
import apiClient from '../../services/api';

export default function ProfileScreen({ navigation }: any) {
  const user = useStore((state) => state.user);
  const walletBalance = useStore((state) => state.walletBalance);
  const setWalletBalance = useStore((state) => state.setWalletBalance);
  const logout = useStore((state) => state.logout);

  // Sync wallet balance from server on profile open
  useEffect(() => {
    const syncWallet = async () => {
      try {
        const res = await apiClient.get('/wallet');
        setWalletBalance(Number(res.data.balance) || 0);
      } catch {
        // Silently fail — cached balance shown
      }
    };
    syncWallet();
  }, [setWalletBalance]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Guest';
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '?';

  const MENU_ITEMS = [
    { icon: 'wallet', label: 'My Wallet', color: '#f5dd4b', onPress: () => navigation.navigate('Wallet') },
    { icon: 'ticket', label: 'My Tickets', color: '#00bcd4', onPress: () => navigation.navigate('Bookings') },
    { icon: 'home', label: 'Apartment Bookings', color: '#9c27b0', onPress: () => navigation.navigate('ApartmentList') },
    { icon: 'car-sport', label: 'Car Rentals', color: '#ff9800', onPress: () => navigation.navigate('CarList') },
    { icon: 'people', label: 'Queue Status', color: '#00C851', onPress: () => navigation.navigate('Queue', { venueId: '', venueName: 'Select a Venue' }) },
  ];

  return (
    <View style={styles.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>

          {user?.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Wallet balance card */}
        <TouchableOpacity style={styles.walletCard} onPress={() => navigation.navigate('Wallet')} activeOpacity={0.8}>
          <View style={styles.walletLeft}>
            <Ionicons name="wallet" size={28} color="#f5dd4b" />
            <View style={{ marginLeft: 14 }}>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletBalance}>
                ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
          <View style={styles.topUpChip}>
            <Ionicons name="add" size={14} color="#000" />
            <Text style={styles.topUpChipText}>Top Up</Text>
          </View>
        </TouchableOpacity>

        {/* Menu items */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem}
              onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#444" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Account section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionHeader}>Account</Text>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <Ionicons name="person-circle-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.menuLabel}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.menuLabel}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.menuLabel}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#ff4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={styles.version}>D'Lifestyle v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  avatarContainer: { marginBottom: 16 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#f5dd4b', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(245,221,75,0.3)',
  },
  avatarText: { color: '#000', fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#888', marginBottom: 10 },
  roleBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: 'rgba(245,221,75,0.15)', borderRadius: 20,
  },
  roleText: { color: '#f5dd4b', fontSize: 11, fontWeight: '700' },
  walletCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(245,221,75,0.07)', marginHorizontal: 20, borderRadius: 14,
    padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(245,221,75,0.2)',
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center' },
  walletLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  walletBalance: { color: '#f5dd4b', fontSize: 22, fontWeight: 'bold' },
  topUpChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5dd4b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  topUpChipText: { color: '#000', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  menuSection: {
    backgroundColor: 'rgba(255,255,255,0.03)', marginHorizontal: 20,
    borderRadius: 14, marginBottom: 16, overflow: 'hidden',
  },
  sectionHeader: { color: '#555', fontSize: 11, fontWeight: '700', padding: 16, paddingBottom: 4 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuLabel: { flex: 1, color: '#fff', fontSize: 15 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, paddingVertical: 16,
    borderRadius: 12, borderWidth: 1, borderColor: '#ff4444',
    marginBottom: 12,
  },
  logoutText: { color: '#ff4444', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  version: { textAlign: 'center', color: '#333', fontSize: 11 },
});