/**
 * ApartmentBookingScreen
 * Route: ApartmentBooking
 * Params: { apartmentId, apartmentName, pricePerNight }
 *
 * Lets the user pick check-in/out dates.
 * On confirm → POST /apartments → navigate to Payment { bookingId, totalAmount, bookingType }
 *
 * Business rules:
 *  - totalAmount = (pricePerNight × nights) + ₦400 service charge
 *  - cautionFee = 10% of basePrice (backend-calculated, shown for info only)
 *  - Platform commission (3%) is venue-paid, never shown to user
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StarlightBackground from '../../components/StarlightBackground';
import { useStore } from '../../store/useStore';
import { apartmentsAPI, SERVICE_CHARGE } from '../../services/api';

export default function ApartmentBookingScreen({ route, navigation }: any) {
  const { apartmentId, apartmentName, pricePerNight } = route.params || {};
  const addBooking = useStore((state) => state.addBooking);

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Date helpers ────────────────────────────────────────────────────────────
  const parseDate = (s: string): Date | null => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const calcNights = (): number => {
    const d1 = parseDate(checkIn);
    const d2 = parseDate(checkOut);
    if (!d1 || !d2) return 0;
    return Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / 86400000));
  };

  const formatDisplayDate = (s: string): string => {
    const d = parseDate(s);
    if (!d) return s;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const nights = calcNights();
  const basePrice = (pricePerNight || 0) * nights;
  const serviceCharge = SERVICE_CHARGE; // ₦400
  const totalAmount = basePrice + serviceCharge;
  const cautionFee = Math.ceil(basePrice * 0.1); // 10% — backend-calculated, shown for info

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleBook = async () => {
    if (!checkIn.trim() || !checkOut.trim()) {
      Alert.alert('Missing Dates', 'Please enter both check-in and check-out dates.');
      return;
    }
    if (!parseDate(checkIn) || !parseDate(checkOut)) {
      Alert.alert('Invalid Dates', 'Please enter dates in YYYY-MM-DD format.');
      return;
    }
    if (nights <= 0) {
      Alert.alert('Invalid Dates', 'Check-out must be after check-in.');
      return;
    }
    if (!apartmentId) {
      Alert.alert('Error', 'No apartment selected. Please go back and try again.');
      return;
    }

    try {
      setLoading(true);
      // POST /apartments
      const booking = await apartmentsAPI.bookApartment({
        apartmentId,
        checkInDate: new Date(checkIn).toISOString(),
        checkOutDate: new Date(checkOut).toISOString(),
        price: basePrice,
      });
      addBooking(booking);
      navigation.navigate('Payment', {
        bookingId: booking.id,
        totalAmount: booking.totalAmount,
        bookingType: 'apartment',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Booking failed. Please try again.';
      Alert.alert('Booking Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Book Apartment</Text>
        {apartmentName ? <Text style={s.subtitle}>{apartmentName}</Text> : null}

        {/* Check-in */}
        <View style={s.section}>
          <Text style={s.label}>Check-in Date</Text>
          <View style={s.inputWrap}>
            <Ionicons name="calendar-outline" size={20} color="#888" style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#555"
              value={checkIn}
              onChangeText={setCheckIn}
              maxLength={10}
            />
          </View>
          {checkIn.length === 10 && (
            <Text style={s.datePreview}>{formatDisplayDate(checkIn)}</Text>
          )}
        </View>

        {/* Check-out */}
        <View style={s.section}>
          <Text style={s.label}>Check-out Date</Text>
          <View style={s.inputWrap}>
            <Ionicons name="calendar-outline" size={20} color="#888" style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#555"
              value={checkOut}
              onChangeText={setCheckOut}
              maxLength={10}
            />
          </View>
          {checkOut.length === 10 && (
            <Text style={s.datePreview}>{formatDisplayDate(checkOut)}</Text>
          )}
        </View>

        {/* Duration badge */}
        {nights > 0 && (
          <View style={s.nightsBadge}>
            <Ionicons name="moon-outline" size={16} color="#f5dd4b" />
            <Text style={s.nightsText}>{nights} night{nights !== 1 ? 's' : ''}</Text>
          </View>
        )}

        {/* Price summary */}
        {nights > 0 && basePrice > 0 && (
          <View style={s.priceCard}>
            <Text style={s.priceCardTitle}>Price Summary</Text>

            <PriceRow
              label={`₦${(pricePerNight || 0).toLocaleString()} × ${nights} night${nights !== 1 ? 's' : ''}`}
              value={`₦${basePrice.toLocaleString()}`}
            />
            <PriceRow label="Service charge" value={`₦${serviceCharge.toLocaleString()}`}
              note="Non-refundable" />
            <View style={s.divider} />
            <PriceRow label="Total" value={`₦${totalAmount.toLocaleString()}`} highlight />

            <View style={s.cautionNotice}>
              <Ionicons name="information-circle-outline" size={16} color="#888" />
              <Text style={s.cautionText}>
                A refundable caution fee of ₦{cautionFee.toLocaleString()} (10%) is also collected
                separately by the property.
              </Text>
            </View>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[s.bookBtn, (loading || nights <= 0) && { opacity: 0.5 }]}
          onPress={handleBook}
          disabled={loading || nights <= 0}
          activeOpacity={0.85}>
          <LinearGradient colors={['#f5dd4b', '#d4a017']} style={s.bookGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading
              ? <ActivityIndicator color="#111" />
              : <Text style={s.bookBtnText}>
                  {nights > 0
                    ? `Confirm & Pay ₦${totalAmount.toLocaleString()}`
                    : 'Enter Dates to Continue'}
                </Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function PriceRow({ label, value, note, highlight }: {
  label: string; value: string; note?: string; highlight?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#888', fontSize: 14 }}>{label}</Text>
        {note && <Text style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{note}</Text>}
      </View>
      <Text style={{
        color: highlight ? '#f5dd4b' : '#fff',
        fontSize: highlight ? 20 : 14,
        fontWeight: highlight ? 'bold' : '600',
      }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backBtn: {
    position: 'absolute', top: 54, left: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  content: { padding: 20, paddingTop: 110 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 32 },
  section: { marginBottom: 20 },
  label: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 16 },
  datePreview: { color: '#f5dd4b', fontSize: 12, marginTop: 6, marginLeft: 4 },
  nightsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,221,75,0.1)', alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(245,221,75,0.3)', marginBottom: 24,
  },
  nightsText: { color: '#f5dd4b', fontSize: 14, fontWeight: '700' },
  priceCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  priceCardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  cautionNotice: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12, marginTop: 4,
  },
  cautionText: { color: '#666', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 },
  bookBtn: { borderRadius: 14, overflow: 'hidden' },
  bookGradient: { paddingVertical: 18, alignItems: 'center' },
  bookBtnText: { color: '#000', fontSize: 17, fontWeight: 'bold' },
});