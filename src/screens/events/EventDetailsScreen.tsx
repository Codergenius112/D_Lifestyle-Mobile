import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, StatusBar, Share, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import StarlightBackground from '../../components/StarlightBackground';
import { useStore } from '../../store/useStore';
import { eventsAPI } from '../../services/api';
import type { BackendEvent } from '../../services/api';

const { width, height } = Dimensions.get('window');

export default function EventDetailsScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const favoriteEvents = useStore((state) => state.favoriteEvents);
  const addFavoriteEvent = useStore((state) => state.addFavoriteEvent);
  const removeFavoriteEvent = useStore((state) => state.removeFavoriteEvent);

  const [event, setEvent] = useState<BackendEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'lineup'>('about');

  const isFavorite = favoriteEvents.includes(eventId);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      // GET /events/:id — only endpoint that exists for event details
      // NOTE: /events/:id/menu and /events/:id/ambience do NOT exist on the backend.
      // Menu belongs to the orders module; ambience/gallery is not yet implemented.
      const data = await eventsAPI.getEventById(eventId);
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFavoriteEvent(eventId);
    } else {
      addFavoriteEvent(eventId);
    }
  };

  const shareEvent = async () => {
    try {
      await Share.share({
        message: `Check out ${event?.name} on D'Lifestyle! 🎉`,
        url: `https://dlifestyle.app/events/${eventId}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const renderAboutTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.description}>{event?.description || 'No description available.'}</Text>

      {/* Info Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Ionicons name="calendar" size={24} color="#f5dd4b" />
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {formatDate(event?.startDate || '')}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="time" size={24} color="#f5dd4b" />
          <Text style={styles.infoLabel}>Time</Text>
          <Text style={styles.infoValue}>
            {formatTime(event?.startDate || '')}
          </Text>
        </View>
      </View>

      {event?.dresscode && (
        <View style={styles.infoGrid}>
          <View style={[styles.infoCard, { flex: 1, marginRight: 0 }]}>
            <Ionicons name="shirt" size={24} color="#f5dd4b" />
            <Text style={styles.infoLabel}>Dress Code</Text>
            <Text style={styles.infoValue}>{event.dresscode}</Text>
          </View>
          <View style={[styles.infoCard, { flex: 1 }]}>
            <Ionicons name="people" size={24} color="#f5dd4b" />
            <Text style={styles.infoLabel}>Capacity</Text>
            <Text style={styles.infoValue}>{event?.capacity?.toLocaleString() || 'TBD'}</Text>
          </View>
        </View>
      )}

      {/* Genre */}
      {event?.genre && (
        <View style={styles.genreContainer}>
          <Text style={styles.sectionTitle}>Genre</Text>
          <View style={styles.genreChip}>
            <Ionicons name="musical-notes" size={14} color="#f5dd4b" />
            <Text style={styles.genreText}>{event.genre}</Text>
          </View>
        </View>
      )}

      {/* Booking notice */}
      <View style={styles.noticeCard}>
        <Ionicons name="information-circle" size={16} color="#00bcd4" />
        <Text style={styles.noticeText}>
          Service charge of ₦400 applies per booking. Platform commission is venue-paid and not charged to guests.
        </Text>
      </View>
    </View>
  );

  const renderLineupTab = () => (
    <View style={styles.tabContent}>
      {event?.djs && event.djs.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>DJs & Artists</Text>
          {event.djs.map((dj, index) => (
            <View key={index} style={styles.djCard}>
              <View style={styles.djAvatar}>
                <Ionicons name="musical-note" size={24} color="#f5dd4b" />
              </View>
              <View style={styles.djInfo}>
                <Text style={styles.djName}>{dj}</Text>
                <Text style={styles.djRole}>Performing Artist</Text>
              </View>
            </View>
          ))}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={48} color="#444" />
          <Text style={styles.emptyText}>Lineup not announced yet</Text>
          <Text style={styles.emptySubtext}>Check back closer to the event date</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StarlightBackground />
        <ActivityIndicator size="large" color="#f5dd4b" />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <StarlightBackground />
        <Ionicons name="calendar-outline" size={64} color="#444" />
        <Text style={styles.loadingText}>Event not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero section (no image — backend doesn't store coverImage yet) */}
        <LinearGradient
          colors={['#1a1500', '#2a2000', '#000']}
          style={styles.heroContainer}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={shareEvent}>
              <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={toggleFavorite}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? '#ff4444' : '#fff'}
              />
            </TouchableOpacity>
          </View>

          {/* Event Icon */}
          <View style={styles.eventIconContainer}>
            <Ionicons name="musical-notes" size={56} color="#f5dd4b" />
          </View>

          {/* Status badge */}
          <View style={[
            styles.statusBadge,
            { backgroundColor: event.status === 'active' ? 'rgba(0,200,81,0.2)' : 'rgba(255,68,68,0.2)' },
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: event.status === 'active' ? '#00C851' : '#ff4444' },
            ]} />
            <Text style={[
              styles.statusText,
              { color: event.status === 'active' ? '#00C851' : '#ff4444' },
            ]}>
              {event.status?.toUpperCase()}
            </Text>
          </View>
        </LinearGradient>

        {/* Title section */}
        <View style={styles.titleContainer}>
          {event.genre && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.genre.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.eventTitle}>{event.name}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="#888" />
            <Text style={styles.dateText}>{formatDate(event.startDate)}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['about', 'lineup'] as const).map((tab) => (
            <TouchableOpacity key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'about' && renderAboutTab()}
        {activeTab === 'lineup' && renderLineupTab()}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Book CTA */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.navigate('BookingFlow', { eventId })}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#f5dd4b', '#d4a017']} style={styles.bookGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.bookButtonText}>Book Now</Text>
            <Ionicons name="arrow-forward" size={20} color="#111" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { color: '#888', fontSize: 16, marginTop: 16 },
  backBtn: {
    marginTop: 24, backgroundColor: '#f5dd4b',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8,
  },
  backBtnText: { color: '#000', fontWeight: 'bold' },
  scrollView: { flex: 1 },
  heroContainer: {
    height: height * 0.28, justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  backButton: {
    position: 'absolute', top: 54, left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  actionButtons: { position: 'absolute', top: 54, right: 20, flexDirection: 'row' },
  actionButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
    marginLeft: 12,
  },
  eventIconContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(245,221,75,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(245,221,75,0.2)',
  },
  statusBadge: {
    position: 'absolute', bottom: 16, right: 20,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  titleContainer: { padding: 20 },
  categoryBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(245,221,75,0.15)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 12,
  },
  categoryText: { color: '#f5dd4b', fontSize: 11, fontWeight: '600' },
  eventTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { color: '#888', fontSize: 13, marginLeft: 6 },
  tabs: {
    flexDirection: 'row', borderBottomWidth: 1,
    borderBottomColor: '#222', paddingHorizontal: 20,
  },
  tab: { paddingVertical: 14, paddingHorizontal: 20, marginRight: 8 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#f5dd4b' },
  tabText: { color: '#666', fontSize: 15, fontWeight: '600' },
  activeTabText: { color: '#f5dd4b' },
  tabContent: { padding: 20 },
  description: { color: '#ccc', fontSize: 15, lineHeight: 24, marginBottom: 24 },
  infoGrid: { flexDirection: 'row', marginBottom: 16 },
  infoCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    padding: 16, marginRight: 8, alignItems: 'center',
  },
  infoLabel: { color: '#888', fontSize: 11, marginTop: 8 },
  infoValue: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  genreContainer: { marginBottom: 20 },
  genreChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,221,75,0.1)', alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
  },
  genreText: { color: '#f5dd4b', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  noticeCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(0,188,212,0.08)', borderRadius: 10,
    padding: 14, marginTop: 8,
  },
  noticeText: { color: '#888', fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 18 },
  djCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 10,
  },
  djAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(245,221,75,0.1)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  djInfo: { flex: 1 },
  djName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  djRole: { color: '#888', fontSize: 12, marginTop: 3 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 14 },
  emptySubtext: { color: '#666', fontSize: 13, marginTop: 6 },
  bottomContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: 'rgba(0,0,0,0.95)',
    borderTopWidth: 1, borderTopColor: '#222',
  },
  bookButton: { borderRadius: 12, overflow: 'hidden' },
  bookGradient: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', paddingVertical: 16,
  },
  bookButtonText: { color: '#111', fontSize: 18, fontWeight: 'bold', marginRight: 8 },
});