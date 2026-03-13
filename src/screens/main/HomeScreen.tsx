import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarlightBackground from '../../components/StarlightBackground';
import { useStore } from '../../store/useStore';
import { eventsAPI } from '../../services/api';
import apiClient from '../../services/api';
import type { BackendEvent } from '../../services/api';

export default function HomeScreen({ navigation }: any) {
  const user = useStore((state) => state.user);
  const walletBalance = useStore((state) => state.walletBalance);
  const setWalletBalance = useStore((state) => state.setWalletBalance);
  const inQueue = useStore((state) => state.inQueue);
  const queuePosition = useStore((state) => state.queuePosition);

  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // GET /events — fetch upcoming events
      const eventsRes = await eventsAPI.getEvents({ limit: 10, offset: 0 });
      setEvents(eventsRes.events || []);

      // Sync wallet balance from server
      try {
        const walletRes = await apiClient.get('/wallet');
        setWalletBalance(Number(walletRes.data.balance) || 0);
      } catch {
        // Non-critical — cached balance shown
      }
    } catch (err) {
      console.error('Failed to fetch home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setWalletBalance]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const firstName = user?.firstName || 'there';

  return (
    <View style={styles.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)}
            tintColor="#f5dd4b" colors={['#f5dd4b']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {firstName} 👋</Text>
            <Text style={styles.subGreeting}>What are you exploring tonight?</Text>
          </View>
          <TouchableOpacity style={styles.walletChip}
            onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="wallet" size={16} color="#f5dd4b" />
            <Text style={styles.walletChipText}>₦{walletBalance.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>

        {/* Queue status banner */}
        {inQueue && (
          <TouchableOpacity style={styles.queueBanner}
            onPress={() => navigation.navigate('Queue', {})}>
            <Ionicons name="people" size={18} color="#00bcd4" />
            <Text style={styles.queueBannerText}>
              You're #{queuePosition} in queue · Tap for details
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#00bcd4" />
          </TouchableOpacity>
        )}

        {/* Quick access */}
        <View style={styles.quickAccess}>
          {[
            { icon: 'ticket', label: 'Tickets', color: '#00bcd4', screen: 'Bookings' },
            { icon: 'restaurant', label: 'Tables', color: '#9c27b0', screen: 'Discover' },
            { icon: 'home', label: 'Apartments', screen: 'ApartmentList', color: '#ff9800' },
            { icon: 'car-sport', label: 'Cars', screen: 'CarList', color: '#00C851' },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.quickItem}
              onPress={() => navigation.navigate(item.screen)}>
              <View style={[styles.quickIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Events section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
              <Text style={styles.sectionSeeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#f5dd4b" style={{ marginTop: 20 }} />
          ) : events.length === 0 ? (
            <View style={styles.noEvents}>
              <Ionicons name="calendar-outline" size={40} color="#444" />
              <Text style={styles.noEventsText}>No upcoming events yet</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}>
              {events.map((event) => (
                <TouchableOpacity key={event.id} style={styles.eventCard}
                  onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
                  activeOpacity={0.8}>
                  <View style={styles.eventCardTop}>
                    <View style={styles.eventGenreBadge}>
                      <Ionicons name="musical-notes" size={14} color="#f5dd4b" />
                      <Text style={styles.eventGenreText}>{event.genre || 'Event'}</Text>
                    </View>
                  </View>
                  <View style={styles.eventCardBottom}>
                    <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
                    <View style={styles.eventMeta}>
                      <Ionicons name="calendar" size={12} color="#888" />
                      <Text style={styles.eventDate}>{formatDate(event.startDate)}</Text>
                    </View>
                    {event.dresscode && (
                      <View style={styles.dresscodePill}>
                        <Text style={styles.dresscodeText}>{event.dresscode}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subGreeting: { fontSize: 13, color: '#888', marginTop: 3 },
  walletChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,221,75,0.1)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,221,75,0.2)',
  },
  walletChipText: { color: '#f5dd4b', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  queueBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,188,212,0.1)', marginHorizontal: 20, borderRadius: 10,
    padding: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,188,212,0.2)',
  },
  queueBannerText: { color: '#00bcd4', fontSize: 13, flex: 1, marginLeft: 10 },
  quickAccess: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 10, marginBottom: 32,
  },
  quickItem: { alignItems: 'center', width: 72 },
  quickIcon: {
    width: 56, height: 56, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  quickLabel: { color: '#888', fontSize: 11, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  sectionSeeAll: { color: '#f5dd4b', fontSize: 14 },
  noEvents: { alignItems: 'center', paddingVertical: 32 },
  noEventsText: { color: '#555', fontSize: 14, marginTop: 10 },
  eventCard: {
    width: 200, height: 200, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, marginLeft: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  eventCardTop: { flex: 1, padding: 12 },
  eventGenreBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,221,75,0.15)', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start',
  },
  eventGenreText: { color: '#f5dd4b', fontSize: 10, fontWeight: '600', marginLeft: 4 },
  eventCardBottom: { padding: 12, backgroundColor: 'rgba(0,0,0,0.6)' },
  eventName: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  eventDate: { color: '#888', fontSize: 12, marginLeft: 4 },
  dresscodePill: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start',
  },
  dresscodeText: { color: '#aaa', fontSize: 10 },
});