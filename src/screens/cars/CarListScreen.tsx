/**
 * CarListScreen
 * Route: CarList
 *
 * Fetches GET /cars/listings — browsable catalogue of available cars.
 * Filters: city, minPrice, maxPrice, category, transmission.
 * Tap a card → CarDetails { listingId }
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StarlightBackground from '../../components/StarlightBackground';
import { carsAPI } from '../../services/api';
import type { CarListing } from '../../services/api';

const CATEGORIES = ['sedan', 'suv', 'luxury', 'van'];
const TRANSMISSIONS = ['automatic', 'manual'];

const CATEGORY_ICON: Record<string, any> = {
  sedan: 'car-outline',
  suv: 'car-sport-outline',
  luxury: 'diamond-outline',
  van: 'bus-outline',
};

export default function CarListScreen({ navigation }: any) {
  const [listings, setListings] = useState<CarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [city, setCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [category, setCategory] = useState('');
  const [transmission, setTransmission] = useState('');

  const buildParams = () => ({
    city: city.trim() || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    category: category || undefined,
    transmission: transmission || undefined,
  });

  const fetchListings = useCallback(async (params?: object) => {
    try {
      setLoading(true);
      const res = await carsAPI.getListings({ limit: 20, offset: 0, ...params });
      setListings(res.listings || []);
    } catch (err) {
      console.error('Failed to fetch car listings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleApply = () => { setShowFilters(false); fetchListings(buildParams()); };

  const handleClear = () => {
    setCity(''); setMinPrice(''); setMaxPrice('');
    setCategory(''); setTransmission('');
    setShowFilters(false);
    fetchListings();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchListings(buildParams());
    setRefreshing(false);
  };

  const hasFilters = !!(city || minPrice || maxPrice || category || transmission);

  return (
    <View style={s.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Car Rentals</Text>
        <TouchableOpacity
          style={[s.iconBtn, hasFilters && s.iconBtnActive]}
          onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="options-outline" size={20} color={hasFilters ? '#000' : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={s.filterPanel}>
          <Text style={s.filterTitle}>Filter Cars</Text>

          <Text style={s.filterLabel}>City</Text>
          <View style={s.filterInput}>
            <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 8 }} />
            <TextInput style={s.filterText} placeholder="e.g. Lagos"
              placeholderTextColor="#555" value={city} onChangeText={setCity} />
          </View>

          <Text style={s.filterLabel}>Price per day (₦)</Text>
          <View style={s.priceRow}>
            <View style={[s.filterInput, { flex: 1 }]}>
              <TextInput style={s.filterText} placeholder="Min" placeholderTextColor="#555"
                value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" />
            </View>
            <Text style={s.priceSep}>—</Text>
            <View style={[s.filterInput, { flex: 1 }]}>
              <TextInput style={s.filterText} placeholder="Max" placeholderTextColor="#555"
                value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" />
            </View>
          </View>

          <Text style={s.filterLabel}>Category</Text>
          <View style={s.chipRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c}
                style={[s.chip, category === c && s.chipActive]}
                onPress={() => setCategory(category === c ? '' : c)}>
                <Text style={[s.chipText, category === c && { color: '#000' }]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.filterLabel}>Transmission</Text>
          <View style={s.chipRow}>
            {TRANSMISSIONS.map((t) => (
              <TouchableOpacity key={t}
                style={[s.chip, transmission === t && s.chipActive]}
                onPress={() => setTransmission(transmission === t ? '' : t)}>
                <Text style={[s.chipText, transmission === t && { color: '#000' }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.filterActions}>
            <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
              <Text style={s.clearBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.applyBtn} onPress={handleApply}>
              <LinearGradient colors={['#f5dd4b', '#d4a017']} style={s.applyGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.applyText}>Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Listings */}
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
            tintColor="#f5dd4b" colors={['#f5dd4b']} />
        }>
        {loading ? (
          <View style={s.centered}><ActivityIndicator size="large" color="#f5dd4b" /></View>
        ) : listings.length === 0 ? (
          <View style={s.centered}>
            <Ionicons name="car-sport-outline" size={64} color="#333" />
            <Text style={s.emptyTitle}>No cars found</Text>
            <Text style={s.emptySub}>
              {hasFilters ? 'Try adjusting your filters' : 'Check back soon for new listings'}
            </Text>
            {hasFilters && (
              <TouchableOpacity style={s.clearFiltersBtn} onPress={handleClear}>
                <Text style={s.clearFiltersBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={s.resultsLabel}>
              {listings.length} car{listings.length !== 1 ? 's' : ''} available
            </Text>
            {listings.map((item) => (
              <TouchableOpacity key={item.id} style={s.card}
                onPress={() => navigation.navigate('CarDetails', { listingId: item.id })}
                activeOpacity={0.85}>

                {/* Card hero */}
                <LinearGradient colors={['#0d0d1a', '#1a1a2a']} style={s.cardHero}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name={CATEGORY_ICON[item.category] || 'car-outline'} size={44} color="#f5dd4b" />
                  {item.withDriver && (
                    <View style={s.driverBadge}>
                      <Ionicons name="person" size={11} color="#000" />
                      <Text style={s.driverBadgeText}>Driver Incl.</Text>
                    </View>
                  )}
                </LinearGradient>

                <View style={s.cardBody}>
                  <Text style={s.cardName} numberOfLines={1}>
                    {item.year} {item.make} {item.model}
                  </Text>
                  <View style={s.infoRow}>
                    <Ionicons name="location-outline" size={13} color="#888" />
                    <Text style={s.infoText}>{item.city}, {item.state}</Text>
                  </View>
                  <View style={s.statsRow}>
                    <SmallChip icon="people-outline" label={`${item.seats} seats`} />
                    <SmallChip icon="settings-outline" label={item.transmission} />
                    <SmallChip icon="pricetag-outline" label={item.category} />
                  </View>
                  {item.features?.length > 0 && (
                    <View style={s.tagsRow}>
                      {item.features.slice(0, 3).map((f, i) => (
                        <View key={i} style={s.tag}><Text style={s.tagText}>{f}</Text></View>
                      ))}
                      {item.features.length > 3 && (
                        <Text style={s.tagMore}>+{item.features.length - 3}</Text>
                      )}
                    </View>
                  )}
                  <View style={s.cardFooter}>
                    <View>
                      <Text style={s.price}>₦{Number(item.pricePerDay).toLocaleString()}</Text>
                      <Text style={s.perLabel}>per day</Text>
                    </View>
                    <View style={s.viewBtn}>
                      <Text style={s.viewBtnText}>View</Text>
                      <Ionicons name="arrow-forward" size={14} color="#f5dd4b" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function SmallChip({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10,
      paddingVertical: 5, borderRadius: 8 }}>
      <Ionicons name={icon} size={12} color="#888" />
      <Text style={{ color: '#888', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  iconBtnActive: { backgroundColor: '#f5dd4b' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  filterPanel: {
    backgroundColor: '#0e0e0e', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', padding: 20,
  },
  filterTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  filterLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  filterInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#222',
  },
  filterText: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceSep: { color: '#555', fontSize: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: '#222',
  },
  chipActive: { backgroundColor: '#f5dd4b', borderColor: '#f5dd4b' },
  chipText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  filterActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  clearBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: '#222',
  },
  clearBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },
  applyBtn: { flex: 2, borderRadius: 10, overflow: 'hidden' },
  applyGrad: { paddingVertical: 14, alignItems: 'center' },
  applyText: { color: '#000', fontSize: 15, fontWeight: '700' },
  scroll: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySub: { color: '#666', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  clearFiltersBtn: {
    backgroundColor: '#f5dd4b', paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 8, marginTop: 20,
  },
  clearFiltersBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  resultsLabel: { color: '#888', fontSize: 13, paddingHorizontal: 20, paddingVertical: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    marginHorizontal: 20, marginBottom: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#1a1a1a',
  },
  cardHero: { height: 110, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  driverBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f5dd4b', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  driverBadgeText: { color: '#000', fontSize: 10, fontWeight: '700' },
  cardBody: { padding: 16 },
  cardName: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { color: '#888', fontSize: 13, marginLeft: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  tag: {
    backgroundColor: 'rgba(0,188,212,0.1)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 6,
  },
  tagText: { color: '#00bcd4', fontSize: 11, fontWeight: '500' },
  tagMore: { color: '#666', fontSize: 11, alignSelf: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { color: '#f5dd4b', fontSize: 20, fontWeight: 'bold' },
  perLabel: { color: '#666', fontSize: 11 },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(245,221,75,0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  viewBtnText: { color: '#f5dd4b', fontSize: 13, fontWeight: '600' },
});