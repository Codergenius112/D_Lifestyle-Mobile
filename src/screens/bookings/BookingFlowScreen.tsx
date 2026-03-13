import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StarlightBackground from '../../components/StarlightBackground';
import { useStore } from '../../store/useStore';
import {
  eventsAPI, ticketsAPI, tablesAPI, tableListingsAPI,
  calculateCheckoutTotal, SERVICE_CHARGE,
} from '../../services/api';
import type { BackendEvent } from '../../services/api';

// ── Types ────────────────────────────────────────────────────────────────────
interface TableOption {
  id: string;
  venueId: string;
  name: string;
  category: 'standard' | 'vip' | 'vvip' | 'booth' | 'private';
  capacity: number;
  price: number;
  description: string;
  features: string[];
  available: boolean;
}

interface TicketType {
  id: string;
  name: string;
  pricePerTicket: number;
  available: number;
  description: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  vvip: '#f5dd4b',
  vip: '#ff9500',
  booth: '#af52de',
  private: '#ff2d55',
  standard: '#888',
};

const ticketTypes: TicketType[] = [
  { id: 'tkt-reg',  name: 'Regular Entry', pricePerTicket: 5000,  available: 100, description: 'General admission' },
  { id: 'tkt-vip',  name: 'VIP Entry',     pricePerTicket: 15000, available: 50,  description: 'VIP section access' },
  { id: 'tkt-vvip', name: 'VVIP Entry',    pricePerTicket: 25000, available: 20,  description: 'Premium VIP access + perks' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function BookingFlowScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const user = useStore((state) => state.user);
  const addBooking = useStore((state) => state.addBooking);

  const [bookingType, setBookingType] = useState<'ticket' | 'table'>('ticket');
  const [selectedTable, setSelectedTable] = useState<TableOption | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [isGroupBooking, setIsGroupBooking] = useState(false);

  const [event, setEvent] = useState<BackendEvent | null>(null);
  const [tableOptions, setTableOptions] = useState<TableOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch event on mount ───────────────────────────────────────────────────
  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  // ── Fetch tables when user switches to Tables tab ─────────────────────────
  useEffect(() => {
    if (bookingType === 'table' && event?.venueId) {
      fetchVenueTables(event.venueId);
    }
  }, [bookingType, event?.venueId]);

  const fetchEvent = async () => {
    try {
      const data = await eventsAPI.getEventById(eventId);
      setEvent(data);
    } catch (err) {
      console.error('Failed to fetch event:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVenueTables = async (venueId: string) => {
    try {
      setTablesLoading(true);
      setTablesError(null);
      const { tables } = await tableListingsAPI.getVenueTables(venueId);
      setTableOptions(tables);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
      setTablesError('Could not load tables. Tap to retry.');
    } finally {
      setTablesLoading(false);
    }
  };

  // ── Price breakdown ────────────────────────────────────────────────────────
  const calculateTotal = () => {
    if (bookingType === 'table' && selectedTable) {
      return calculateCheckoutTotal(selectedTable.price);
    }
    if (bookingType === 'ticket' && selectedTicket) {
      return calculateCheckoutTotal(selectedTicket.pricePerTicket * ticketQuantity);
    }
    return { basePrice: 0, serviceCharge: 0, total: 0, platformCommission: 0, venueNet: 0 };
  };

  // ── Proceed to payment ─────────────────────────────────────────────────────
  const handleProceedToPayment = async () => {
    if (bookingType === 'table' && !selectedTable) {
      Alert.alert('Error', 'Please select a table');
      return;
    }
    if (bookingType === 'ticket' && !selectedTicket) {
      Alert.alert('Error', 'Please select a ticket type');
      return;
    }

    const { total, basePrice } = calculateTotal();

    if (isGroupBooking) {
      navigation.navigate('GroupBooking', {
        eventId,
        bookingType,
        selectedItem: bookingType === 'table' ? selectedTable : selectedTicket,
        quantity: bookingType === 'ticket' ? ticketQuantity : 1,
        totalAmount: total,
        basePrice,
      });
      return;
    }

    try {
      setSubmitting(true);
      let newBooking;

      if (bookingType === 'ticket' && selectedTicket) {
        newBooking = await ticketsAPI.createTicket({
          eventId,
          quantity: ticketQuantity,
          totalPrice: selectedTicket.pricePerTicket * ticketQuantity,
        });
      } else if (bookingType === 'table' && selectedTable) {
        newBooking = await tablesAPI.bookTable({
          venueId: selectedTable.venueId,
          tableId: selectedTable.id,
          guestCount: selectedTable.capacity,
          bookingDate: event?.startDate || new Date().toISOString(),
          price: selectedTable.price,
        });
      }

      if (newBooking) {
        addBooking(newBooking);
        navigation.navigate('Payment', {
          bookingId: newBooking.id,
          totalAmount: newBooking.totalAmount,
          bookingType,
        });
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to create booking. Please try again.';
      Alert.alert('Booking Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const { basePrice, serviceCharge, total } = calculateTotal();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StarlightBackground />
        <ActivityIndicator size="large" color="#f5dd4b" />
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Now</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Booking type toggle */}
        <View style={styles.toggleContainer}>
          {(['ticket', 'table'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.toggleButton, bookingType === type && styles.toggleButtonActive]}
              onPress={() => {
                setBookingType(type);
                setSelectedTable(null);
                setSelectedTicket(null);
              }}
            >
              <Ionicons
                name={type === 'ticket' ? 'ticket' : 'restaurant'}
                size={20}
                color={bookingType === type ? '#000' : '#888'}
              />
              <Text style={[styles.toggleText, bookingType === type && styles.toggleTextActive]}>
                {type === 'ticket' ? 'Tickets' : 'Tables'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {bookingType === 'ticket' ? 'Select Ticket Type' : 'Select Table'}
          </Text>

          {/* ── Tables ── */}
          {bookingType === 'table' && (
            <>
              {/* No venueId attached to event */}
              {!event?.venueId && (
                <View style={styles.emptyState}>
                  <Ionicons name="information-circle" size={32} color="#888" />
                  <Text style={styles.emptyStateText}>No venue attached to this event.</Text>
                </View>
              )}

              {/* Loading tables */}
              {event?.venueId && tablesLoading && (
                <ActivityIndicator size="large" color="#f5dd4b" style={{ marginTop: 24 }} />
              )}

              {/* Error + retry */}
              {event?.venueId && tablesError && !tablesLoading && (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => fetchVenueTables(event.venueId)}
                >
                  <Ionicons name="refresh" size={18} color="#f5dd4b" />
                  <Text style={styles.retryText}>{tablesError}</Text>
                </TouchableOpacity>
              )}

              {/* No tables returned */}
              {event?.venueId && !tablesLoading && !tablesError && tableOptions.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="restaurant-outline" size={32} color="#888" />
                  <Text style={styles.emptyStateText}>No tables available for this venue.</Text>
                </View>
              )}

              {/* Table cards */}
              {!tablesLoading && !tablesError && tableOptions.map((table) => (
                <TouchableOpacity
                  key={table.id}
                  style={[
                    styles.optionCard,
                    selectedTable?.id === table.id && styles.optionCardSelected,
                    !table.available && styles.optionCardDisabled,
                  ]}
                  onPress={() => table.available && setSelectedTable(table)}
                  disabled={!table.available}
                >
                  {/* Category chip */}
                  <View style={[styles.categoryChip, { backgroundColor: `${CATEGORY_COLORS[table.category]}22` }]}>
                    <Text style={[styles.categoryText, { color: CATEGORY_COLORS[table.category] }]}>
                      {table.category.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.optionHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionName}>{table.name}</Text>
                      {table.description ? (
                        <Text style={styles.ticketDesc}>{table.description}</Text>
                      ) : null}
                      <View style={styles.capacityRow}>
                        <Ionicons name="people" size={14} color="#888" />
                        <Text style={styles.capacityText}>Capacity: {table.capacity}</Text>
                      </View>
                      {/* Features */}
                      {table.features?.length > 0 && (
                        <View style={styles.featuresRow}>
                          {table.features.map((f, i) => (
                            <View key={i} style={styles.featureChip}>
                              <Text style={styles.featureText}>{f}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.optionPrice}>₦{table.price.toLocaleString()}</Text>
                      {!table.available
                        ? <Text style={styles.unavailableText}>Booked</Text>
                        : <Text style={styles.availableText}>Available</Text>
                      }
                    </View>
                  </View>

                  {selectedTable?.id === table.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#f5dd4b" style={styles.checkmark} />
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* ── Tickets ── */}
          {bookingType === 'ticket' && ticketTypes.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={[styles.optionCard, selectedTicket?.id === ticket.id && styles.optionCardSelected]}
              onPress={() => setSelectedTicket(ticket)}
            >
              <View style={styles.optionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>{ticket.name}</Text>
                  <Text style={styles.ticketDesc}>{ticket.description}</Text>
                  <Text style={styles.availableText}>{ticket.available} available</Text>
                </View>
                <Text style={styles.optionPrice}>₦{ticket.pricePerTicket.toLocaleString()}</Text>
              </View>
              {selectedTicket?.id === ticket.id && (
                <Ionicons name="checkmark-circle" size={20} color="#f5dd4b" style={styles.checkmark} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Ticket quantity */}
        {bookingType === 'ticket' && selectedTicket && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity style={styles.qtyButton}
                onPress={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}>
                <Ionicons name="remove" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.qtyDisplay}>
                <Text style={styles.qtyText}>{ticketQuantity}</Text>
              </View>
              <TouchableOpacity style={styles.qtyButton}
                onPress={() => setTicketQuantity(Math.min(selectedTicket.available, ticketQuantity + 1))}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Group booking toggle */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.groupToggle} onPress={() => setIsGroupBooking(!isGroupBooking)}>
            <View style={styles.groupLeft}>
              <Ionicons name="people" size={24} color="#f5dd4b" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.groupTitle}>Group Booking</Text>
                <Text style={styles.groupSubtitle}>Split payment with friends</Text>
              </View>
            </View>
            <View style={[styles.toggle, isGroupBooking && styles.toggleActive]}>
              <View style={[styles.toggleCircle, isGroupBooking && styles.toggleCircleActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Price breakdown */}
        {(selectedTable || selectedTicket) && (
          <View style={styles.priceBreakdown}>
            <Text style={styles.sectionTitle}>Price Breakdown</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                Subtotal{bookingType === 'ticket' ? ` (${ticketQuantity}x)` : ''}
              </Text>
              <Text style={styles.priceValue}>₦{basePrice.toLocaleString()}</Text>
            </View>
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>Service Charge</Text>
                <Text style={styles.priceNote}>Non-refundable</Text>
              </View>
              <Text style={styles.priceValue}>₦{SERVICE_CHARGE.toLocaleString()}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₦{total.toLocaleString()}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky bottom bar */}
      {(selectedTable || selectedTicket) && (
        <View style={styles.bottomContainer}>
          <View>
            <Text style={styles.bottomLabel}>Total Amount</Text>
            <Text style={styles.bottomValue}>₦{total.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={handleProceedToPayment}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#f5dd4b', '#d4a017']} style={styles.proceedGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {submitting ? <ActivityIndicator color="#111" /> : (
                <>
                  <Text style={styles.proceedText}>
                    {isGroupBooking ? 'Continue to Group' : 'Proceed to Payment'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#111" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  scrollView: { flex: 1 },
  toggleContainer: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4,
  },
  toggleButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 12, borderRadius: 8,
  },
  toggleButtonActive: { backgroundColor: '#f5dd4b' },
  toggleText: { color: '#888', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  toggleTextActive: { color: '#000' },
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  optionCardSelected: { borderColor: '#f5dd4b', backgroundColor: 'rgba(245,221,75,0.1)' },
  optionCardDisabled: { opacity: 0.4 },
  categoryChip: {
    alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8,
    paddingVertical: 3, marginBottom: 10,
  },
  categoryText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  optionName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  capacityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  capacityText: { color: '#888', fontSize: 12, marginLeft: 4 },
  ticketDesc: { color: '#888', fontSize: 12, marginBottom: 4 },
  availableText: { color: '#00C851', fontSize: 11, fontWeight: '600' },
  unavailableText: { color: '#ff4444', fontSize: 11, marginTop: 4 },
  optionPrice: { fontSize: 18, fontWeight: 'bold', color: '#f5dd4b' },
  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  featureChip: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  featureText: { color: '#aaa', fontSize: 11 },
  checkmark: { position: 'absolute', top: 12, right: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyStateText: { color: '#888', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,221,75,0.07)', borderRadius: 10,
    padding: 14, marginBottom: 12,
  },
  retryText: { color: '#f5dd4b', fontSize: 13, flex: 1 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  qtyButton: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(245,221,75,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  qtyDisplay: {
    width: 80, height: 50, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: 16,
  },
  qtyText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  groupToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16,
  },
  groupLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  groupTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  groupSubtitle: { fontSize: 12, color: '#888' },
  toggle: {
    width: 50, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)', padding: 2, justifyContent: 'center',
  },
  toggleActive: { backgroundColor: '#f5dd4b' },
  toggleCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleCircleActive: { alignSelf: 'flex-end' },
  priceBreakdown: {
    marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 16, marginBottom: 24,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  priceLabel: { color: '#888', fontSize: 14 },
  priceNote: { color: '#666', fontSize: 11, marginTop: 2 },
  priceValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  priceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 },
  totalLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  totalValue: { color: '#f5dd4b', fontSize: 20, fontWeight: 'bold' },
  bottomContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 20,
    backgroundColor: 'rgba(0,0,0,0.95)', borderTopWidth: 1, borderTopColor: '#222',
    alignItems: 'center',
  },
  bottomLabel: { color: '#888', fontSize: 12 },
  bottomValue: { color: '#f5dd4b', fontSize: 20, fontWeight: 'bold', flex: 1 },
  proceedButton: { borderRadius: 12, overflow: 'hidden' },
  proceedGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  proceedText: { color: '#111', fontSize: 14, fontWeight: 'bold', marginRight: 8 },
});