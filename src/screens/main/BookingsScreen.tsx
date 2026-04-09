import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarlightBackground from '../../components/StarlightBackground';
import { bookingsAPI } from '../../services/api';
import type { BackendBooking } from '../../services/api';

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  INITIATED:             { color: '#888',    icon: 'time-outline',          label: 'Initiated' },
  PENDING_PAYMENT:       { color: '#f5dd4b', icon: 'time',                  label: 'Pending Payment' },
  PENDING_GROUP_PAYMENT: { color: '#ff9800', icon: 'people',                label: 'Group Payment' },
  CONFIRMED:             { color: '#00C851', icon: 'checkmark-circle',      label: 'Confirmed' },
  CHECKED_IN:            { color: '#00bcd4', icon: 'scan',                  label: 'Checked In' },
  ACTIVE:                { color: '#00C851', icon: 'radio-button-on',       label: 'Active' },
  COMPLETED:             { color: '#888',    icon: 'checkmark-done-circle', label: 'Completed' },
  CANCELLED:             { color: '#ff4444', icon: 'close-circle',          label: 'Cancelled' },
  EXPIRED:               { color: '#ff6b35', icon: 'alert-circle',          label: 'Expired' },
};

const BOOKING_TYPE_ICONS: Record<string, any> = {
  ticket:    'ticket',
  table:     'restaurant',
  apartment: 'home',
  car:       'car-sport',
};

const BOOKING_TYPE_LABEL: Record<string, string> = {
  ticket:    'Event Ticket',
  table:     'Table Booking',
  apartment: 'Apartment',
  car:       'Car Rental',
};

const isUpcoming = (b: BackendBooking) =>
  ['INITIATED', 'PENDING_PAYMENT', 'PENDING_GROUP_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'ACTIVE'].includes(b.status);

const isPast = (b: BackendBooking) =>
  ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(b.status);

const canOrderFood = (b: BackendBooking) =>
  b.bookingType === 'table' &&
  ['CONFIRMED', 'CHECKED_IN', 'ACTIVE'].includes(b.status);

export default function BookingsScreen({ navigation }: any) {
  const [activeTab, setActiveTab]   = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings]     = useState<BackendBooking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const response = await bookingsAPI.getMyBookings({ limit: 50, offset: 0 });
      setBookings(response.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const upcomingBookings = bookings.filter(isUpcoming);
  const pastBookings     = bookings.filter(isPast);
  const displayed        = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleCardPress = (booking: BackendBooking) => {
    switch (booking.bookingType) {
      case 'ticket':
        navigation.navigate('Ticket', { ticketId: booking.id });
        break;
      case 'table':
        if (canOrderFood(booking)) {
          navigation.navigate('OrderTracking', {
            bookingId:   booking.id,
            tableNumber: booking.metadata?.tableNumber,
            venueName:   booking.metadata?.venueName,
          });
        } else if (booking.status === 'PENDING_PAYMENT') {
          navigation.navigate('Payment', {
            bookingId:   booking.id,
            totalAmount: booking.totalAmount,
            bookingType: 'table',
          });
        }
        break;
      case 'apartment':
        navigation.navigate('ApartmentBooking', { bookingId: booking.id });
        break;
      case 'car':
        navigation.navigate('CarDetails', { rentalId: booking.id });
        break;
    }
  };

  const renderBooking = (booking: BackendBooking) => {
    const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG['INITIATED'];
    const typeIcon  = BOOKING_TYPE_ICONS[booking.bookingType] || 'calendar';
    const typeLabel = BOOKING_TYPE_LABEL[booking.bookingType] || booking.bookingType;

    const resourceLabel = (() => {
      if (booking.bookingType === 'table') {
        const t = booking.metadata?.tableNumber;
        const v = booking.metadata?.venueName;
        if (t && v) return `Table ${t} · ${v}`;
        if (t) return `Table ${t}`;
      }
      if (booking.metadata?.name) return booking.metadata.name;
      return `#${booking.resourceId?.slice(0, 8)}`;
    })();

    return (
      <TouchableOpacity key={booking.id} style={styles.bookingCard}
        onPress={() => handleCardPress(booking)} activeOpacity={0.8}>

        <View style={styles.bookingIconContainer}>
          <Ionicons name={typeIcon} size={28} color="#f5dd4b" />
        </View>

        <View style={styles.bookingInfo}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingType}>{typeLabel.toUpperCase()}</Text>
            {booking.status === 'PENDING_GROUP_PAYMENT' && (
              <View style={styles.groupBadge}>
                <Ionicons name="people" size={12} color="#ff9800" />
                <Text style={styles.groupText}>Group</Text>
              </View>
            )}
          </View>

          <Text style={styles.bookingResource} numberOfLines={1}>{resourceLabel}</Text>
          <Text style={styles.bookingDate}>{formatDate(booking.createdAt)}</Text>

          <View style={styles.bookingFooter}>
            <Text style={styles.bookingAmount}>₦{booking.totalAmount?.toLocaleString()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '20' }]}>
              <Ionicons name={statusCfg.icon} size={12} color={statusCfg.color} />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>

          {booking.status === 'PENDING_PAYMENT' && (
            <TouchableOpacity style={styles.actionBtn}
              onPress={() => navigation.navigate('Payment', {
                bookingId:   booking.id,
                totalAmount: booking.totalAmount,
                bookingType: booking.bookingType,
              })}>
              <Ionicons name="card-outline" size={14} color="#000" />
              <Text style={styles.actionBtnText}>Pay Now</Text>
            </TouchableOpacity>
          )}

          {canOrderFood(booking) && (
            <TouchableOpacity style={[styles.actionBtn, styles.orderFoodBtn]}
              onPress={() => navigation.navigate('Menu', {
                bookingId:   booking.id,
                venueId:     booking.metadata?.venueId,
                venueName:   booking.metadata?.venueName,
                tableNumber: booking.metadata?.tableNumber,
              })}>
              <Ionicons name="fast-food-outline" size={14} color="#f5dd4b" />
              <Text style={[styles.actionBtnText, { color: '#f5dd4b' }]}>Order Food & Drinks</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Discover')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {(['upcoming', 'past'] as const).map((tab) => (
          <TouchableOpacity key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'upcoming'
                ? `Upcoming (${upcomingBookings.length})`
                : `Past (${pastBookings.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)}
            tintColor="#f5dd4b" colors={['#f5dd4b']} />
        }>
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#f5dd4b" />
          </View>
        ) : displayed.length > 0 ? (
          displayed.map(renderBooking)
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'upcoming'
                ? 'Book your first event, apartment, or car!'
                : 'Your booking history will appear here'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity style={styles.exploreButton}
                onPress={() => navigation.navigate('Discover')}>
                <Text style={styles.exploreButtonText}>Explore Now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle:  { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  addButton:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5dd4b', justifyContent: 'center', alignItems: 'center' },
  tabsContainer:{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: '#f5dd4b' },
  tabText:      { color: '#666', fontSize: 15, fontWeight: '600' },
  tabTextActive:{ color: '#f5dd4b' },
  scrollView:   { flex: 1 },
  list:         { paddingHorizontal: 20 },
  bookingCard:  { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: '#1a1a1a' },
  bookingIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(245,221,75,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  bookingInfo:  { flex: 1 },
  bookingHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  bookingType:  { color: '#f5dd4b', fontSize: 11, fontWeight: '700', marginRight: 8 },
  groupBadge:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,152,0,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  groupText:    { color: '#ff9800', fontSize: 10, marginLeft: 2 },
  bookingResource: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  bookingDate:  { color: '#888', fontSize: 12, marginBottom: 8 },
  bookingFooter:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bookingAmount:{ color: '#fff', fontSize: 14, fontWeight: '600' },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText:   { fontSize: 11, fontWeight: '600', marginLeft: 4 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f5dd4b', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  orderFoodBtn: { backgroundColor: 'rgba(245,221,75,0.1)', borderWidth: 1, borderColor: 'rgba(245,221,75,0.3)' },
  actionBtnText:{ color: '#000', fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText:    { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtext: { color: '#666', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  exploreButton:{ backgroundColor: '#f5dd4b', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8, marginTop: 24 },
  exploreButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});