import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Dimensions, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StarlightBackground from '../../components/StarlightBackground';
import { eventsAPI } from '../../services/api';
import type { BackendEvent } from '../../services/api';

const { width } = Dimensions.get('window');

const CATEGORIES = ['All', 'Club', 'Concert', 'Festival', 'Party'];

export default function DiscoverScreen({ navigation }: any) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<BackendEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (isPullToRefresh = false) => {
    try {
      if (!isPullToRefresh) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      // GET /events — correct params: limit/offset (NOT page/pageSize)
      const response = await eventsAPI.getEvents({ limit: 50, offset: 0 });
      setEvents(response.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please check your connection and try again.');
      setEvents([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Client-side filtering — backend doesn't have filter endpoint yet
  useEffect(() => {
    let filtered = events;
    if (activeCategory !== 'All') {
      filtered = filtered.filter(
        (e) => e.genre?.toLowerCase() === activeCategory.toLowerCase(),
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) => e.name.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q),
      );
    }
    setFilteredEvents(filtered);
  }, [activeCategory, searchQuery, events]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderEvent = (event: BackendEvent) => (
    <TouchableOpacity
      key={event.id}
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
      activeOpacity={0.8}
    >
      {/* Gradient background in place of image (backend doesn't have coverImage) */}
      <LinearGradient
        colors={['#1a1500', '#2a2000']}
        style={styles.eventCardBg}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.eventIconWrap}>
          <Ionicons name="musical-notes" size={40} color="#f5dd4b" />
        </View>
      </LinearGradient>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.95)']}
        style={styles.eventGradient}
      >
        <View style={styles.eventInfo}>
          {event.genre && (
            <Text style={styles.eventCategory}>{event.genre.toUpperCase()}</Text>
          )}
          <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
          <View style={styles.eventMeta}>
            {event.startDate && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color="#f5dd4b" />
                <Text style={styles.metaText}>{formatDate(event.startDate)}</Text>
              </View>
            )}
            {event.dresscode && (
              <View style={styles.metaItem}>
                <Ionicons name="shirt-outline" size={12} color="#f5dd4b" />
                <Text style={styles.metaText}>{event.dresscode}</Text>
              </View>
            )}
          </View>
          <Text style={styles.capacityText}>
            Capacity: {event.capacity?.toLocaleString() || 'TBD'}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#f5dd4b" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      );
    }

    if (error && events.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
          <Text style={styles.errorTitle}>Couldn't load events</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchEvents()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredEvents.length > 0) {
      return filteredEvents.map(renderEvent);
    }

    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="search-outline" size={64} color="#444" />
        <Text style={styles.emptyText}>
          {searchQuery || activeCategory !== 'All' ? 'No events found' : 'No events available'}
        </Text>
        <Text style={styles.emptySubtext}>
          {searchQuery || activeCategory !== 'All' ? 'Try adjusting your filters' : 'Check back later'}
        </Text>
        {(searchQuery || activeCategory !== 'All') && (
          <TouchableOpacity style={styles.clearFiltersButton}
            onPress={() => { setSearchQuery(''); setActiveCategory('All'); }}>
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        {/* Filter button — clears all filters */}
        <TouchableOpacity style={styles.filterButton}
          onPress={() => { setSearchQuery(''); setActiveCategory('All'); }}>
          <Ionicons name="options-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick access — wired Tickets button */}
      <View style={styles.quickAccessContainer}>
        <TouchableOpacity style={styles.quickAccessButton}
          onPress={() => navigation.navigate('ApartmentList')}>
          <Ionicons name="home" size={18} color="#f5dd4b" />
          <Text style={styles.quickAccessText}>Apartments</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickAccessButton}
          onPress={() => navigation.navigate('CarList')}>
          <Ionicons name="car-sport" size={18} color="#f5dd4b" />
          <Text style={styles.quickAccessText}>Cars</Text>
        </TouchableOpacity>

        {/* Tickets — wired to Bookings tab */}
        <TouchableOpacity style={styles.quickAccessButton}
          onPress={() => navigation.navigate('Bookings')}>
          <Ionicons name="ticket" size={18} color="#f5dd4b" />
          <Text style={styles.quickAccessText}>Tickets</Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, activeCategory === cat && styles.categoryChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Events list */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.eventsGrid,
          (isLoading || error || filteredEvents.length === 0) && styles.centeredContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing} onRefresh={() => fetchEvents(true)}
            tintColor="#f5dd4b" colors={['#f5dd4b']}
          />
        }
      >
        {renderContent()}
        {filteredEvents.length > 0 && <View style={{ height: 40 }} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  filterButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    paddingHorizontal: 16, marginHorizontal: 20, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 12 },
  quickAccessContainer: {
    flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16,
  },
  quickAccessButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(245,221,75,0.08)', paddingVertical: 10,
    borderRadius: 8, marginHorizontal: 3,
  },
  quickAccessText: { color: '#f5dd4b', fontSize: 11, fontWeight: '600', marginLeft: 5 },
  categoriesContainer: { marginBottom: 16 },
  categoriesContent: { paddingHorizontal: 20 },
  categoryChip: {
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 18,
    paddingVertical: 9, borderRadius: 20, marginRight: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryChipActive: { backgroundColor: '#f5dd4b', borderColor: '#f5dd4b' },
  categoryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#000' },
  scrollView: { flex: 1 },
  eventsGrid: { paddingHorizontal: 20 },
  centeredContent: { flex: 1, justifyContent: 'center' },
  eventCard: {
    width: '100%', height: 220, borderRadius: 16,
    overflow: 'hidden', marginBottom: 16, position: 'relative',
  },
  eventCardBg: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  eventIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(245,221,75,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  eventGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
    justifyContent: 'flex-end', padding: 16,
  },
  eventInfo: {},
  eventCategory: { color: '#f5dd4b', fontSize: 10, fontWeight: '700', marginBottom: 5 },
  eventName: { color: '#fff', fontSize: 19, fontWeight: 'bold', marginBottom: 8 },
  eventMeta: { flexDirection: 'row', marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
  metaText: { color: '#ddd', fontSize: 11, marginLeft: 4 },
  capacityText: { color: '#888', fontSize: 11 },
  centeredContainer: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 60, width: '100%',
  },
  loadingText: { color: '#f5dd4b', fontSize: 14, marginTop: 14 },
  errorTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  errorMessage: { color: '#888', fontSize: 13, marginTop: 8, textAlign: 'center', marginHorizontal: 24 },
  emptyText: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginTop: 16 },
  emptySubtext: { color: '#666', fontSize: 13, marginTop: 8 },
  retryButton: {
    backgroundColor: 'rgba(245,221,75,0.15)', paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 8, marginTop: 20, borderWidth: 1, borderColor: '#f5dd4b',
  },
  retryButtonText: { color: '#f5dd4b', fontSize: 14, fontWeight: '600' },
  clearFiltersButton: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 8, marginTop: 16,
  },
  clearFiltersText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});