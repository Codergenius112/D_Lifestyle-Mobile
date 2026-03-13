/**
 * ApartmentDetailsScreen
 * Route: ApartmentDetails
 * Params: { listingId }
 *
 * Fetches GET /apartments/listings/:id — full listing detail.
 * "Book Now" → ApartmentBooking { apartmentId, apartmentName, pricePerNight }
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import StarlightBackground from '../../components/StarlightBackground';
import { apartmentsAPI } from '../../services/api';
import type { ApartmentListing } from '../../services/api';

const { width, height } = Dimensions.get('window');

export default function ApartmentDetailsScreen({ route, navigation }: any) {
  const { listingId } = route.params || {};
  const [listing, setListing] = useState<ApartmentListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!listingId) { setError(true); setLoading(false); return; }
    apartmentsAPI.getListing(listingId)
      .then(setListing)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) {
    return (
      <View style={s.container}>
        <StarlightBackground />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ActivityIndicator size="large" color="#f5dd4b" style={{ marginTop: 140 }} />
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={s.container}>
        <StarlightBackground />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.errorWrap}>
          <Ionicons name="home-outline" size={64} color="#333" />
          <Text style={s.errorText}>Apartment not found</Text>
          <TouchableOpacity style={s.errorBtn} onPress={() => navigation.goBack()}>
            <Text style={s.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Caution fee shown for transparency (backend calculates it, 10% of base price)
  const cautionFee = Math.ceil(Number(listing.pricePerNight) * 0.1);

  return (
    <View style={s.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ width, height: height * 0.35 }}>
          <LinearGradient
            colors={['#1a1500', '#2a2000', '#0d0d0d']}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={s.heroIconRing}>
              <Ionicons name="home" size={64} color="#f5dd4b" />
            </View>
            <View style={s.heroBadges}>
              <Badge icon="bed-outline" label={`${listing.bedrooms} bed`} />
              <Badge icon="water-outline" label={`${listing.bathrooms} bath`} />
              <Badge icon="people-outline" label={`Max ${listing.maxGuests}`} />
            </View>
          </LinearGradient>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={s.content}>
          <Text style={s.title}>{listing.name}</Text>
          <View style={s.locationRow}>
            <Ionicons name="location" size={15} color="#f5dd4b" />
            <Text style={s.locationText}>{listing.address}, {listing.city}, {listing.state}</Text>
          </View>

          {/* About */}
          <Text style={s.sectionTitle}>About</Text>
          <Text style={s.description}>{listing.description}</Text>

          {/* Amenities */}
          {listing.amenities?.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Amenities</Text>
              <View style={s.amenitiesGrid}>
                {listing.amenities.map((a, i) => (
                  <View key={i} style={s.amenityChip}>
                    <Ionicons name="checkmark-circle" size={15} color="#00C851" />
                    <Text style={s.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Pricing */}
          <Text style={s.sectionTitle}>Pricing</Text>
          <View style={s.pricingCard}>
            <PriceRow label="Per night" value={`₦${Number(listing.pricePerNight).toLocaleString()}`} />
            <PriceRow label="Service charge" value="₦400" note="Non-refundable" />
            <PriceRow label="Caution fee" value={`₦${cautionFee.toLocaleString()}`} note="10% — refundable" muted />
            <View style={s.divider} />
            <PriceRow
              label="Total per night (excl. caution)"
              value={`₦${(Number(listing.pricePerNight) + 400).toLocaleString()}`}
              highlight
            />
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Book Now bar */}
      <View style={s.bottomBar}>
        <View>
          <Text style={s.bottomLabel}>Per night</Text>
          <Text style={s.bottomPrice}>₦{Number(listing.pricePerNight).toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={s.bookBtn}
          onPress={() => navigation.navigate('ApartmentBooking', {
            apartmentId: listing.id,
            apartmentName: listing.name,
            pricePerNight: Number(listing.pricePerNight),
          })}
          activeOpacity={0.85}>
          <LinearGradient colors={['#f5dd4b', '#d4a017']} style={s.bookGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={s.bookBtnText}>Book Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Badge({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,221,75,0.3)' }}>
      <Ionicons name={icon} size={13} color="#f5dd4b" />
      <Text style={{ color: '#f5dd4b', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function PriceRow({ label, value, note, highlight, muted }: {
  label: string; value: string; note?: string; highlight?: boolean; muted?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', paddingVertical: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: muted ? '#555' : '#888', fontSize: 14 }}>{label}</Text>
        {note && <Text style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{note}</Text>}
      </View>
      <Text style={{
        color: highlight ? '#f5dd4b' : '#fff',
        fontSize: highlight ? 17 : 15,
        fontWeight: highlight ? 'bold' : '600',
      }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },
  backBtn: {
    position: 'absolute', top: 54, left: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
  },
  heroIconRing: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(245,221,75,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  heroBadges: {
    flexDirection: 'row', gap: 8, position: 'absolute', bottom: 20,
    flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'center',
  },
  content: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, gap: 6 },
  locationText: { color: '#888', fontSize: 14, flex: 1, lineHeight: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 12, marginTop: 8 },
  description: { color: '#bbb', fontSize: 15, lineHeight: 24, marginBottom: 24 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,200,81,0.08)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0,200,81,0.2)',
  },
  amenityText: { color: '#00C851', fontSize: 13 },
  pricingCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingBottom: 36,
    backgroundColor: 'rgba(0,0,0,0.97)', borderTopWidth: 1, borderTopColor: '#1a1a1a',
  },
  bottomLabel: { color: '#888', fontSize: 12 },
  bottomPrice: { color: '#f5dd4b', fontSize: 26, fontWeight: 'bold' },
  bookBtn: { borderRadius: 14, overflow: 'hidden' },
  bookGradient: { paddingHorizontal: 36, paddingVertical: 16 },
  bookBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  errorText: { color: '#888', fontSize: 16, marginTop: 16 },
  errorBtn: {
    marginTop: 20, backgroundColor: 'rgba(245,221,75,0.1)',
    borderWidth: 1, borderColor: '#f5dd4b', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8,
  },
  errorBtnText: { color: '#f5dd4b', fontSize: 14, fontWeight: '600' },
});