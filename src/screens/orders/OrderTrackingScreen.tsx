/**
 * Route: OrderTracking
 * Params: { orderId, bookingId, tableNumber?, venueName? }
 * Polls GET /orders/booking/:bookingId every 15s
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarlightBackground from '../../components/StarlightBackground';
import { ordersAPI } from '../../services/api';
import type { Order } from '../../services/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; description: string }> = {
  CREATED:        { label: 'Order Received',  color: '#888',    icon: 'receipt-outline',       description: 'Your order has been received' },
  ASSIGNED:       { label: 'Waiter Assigned', color: '#00bcd4', icon: 'person-outline',        description: 'A waiter has picked up your order' },
  ROUTED:         { label: 'Sent to Kitchen', color: '#ff9800', icon: 'arrow-forward-circle',  description: 'Your order is heading to the kitchen' },
  IN_PREPARATION: { label: 'Being Prepared',  color: '#ff6b35', icon: 'flame-outline',         description: 'The kitchen is preparing your order' },
  READY:          { label: 'Ready!',          color: '#00C851', icon: 'checkmark-circle',      description: 'Your order is ready, waiter is on the way' },
  SERVED:         { label: 'Served',          color: '#00C851', icon: 'restaurant',            description: 'Your order has been served. Enjoy!' },
  COMPLETED:      { label: 'Completed',       color: '#555',    icon: 'checkmark-done-circle', description: 'Order completed' },
  CANCELLED:      { label: 'Cancelled',       color: '#ff4444', icon: 'close-circle',          description: 'This order was cancelled' },
};

const STATUS_PIPELINE = ['CREATED', 'ASSIGNED', 'ROUTED', 'IN_PREPARATION', 'READY', 'SERVED'];
const POLL_INTERVAL_MS = 15000;

export default function OrderTrackingScreen({ route, navigation }: any) {
  const { bookingId, tableNumber, venueName } = route.params || {};

  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (!bookingId) return;
    try {
      if (isRefresh) setRefreshing(true);
      const data = await ordersAPI.getOrdersByBooking(bookingId);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchOrders();
    pollRef.current = setInterval(() => fetchOrders(), POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchOrders]);

  useEffect(() => {
    const allDone = orders.length > 0 &&
      orders.every(o => ['COMPLETED', 'CANCELLED', 'SERVED'].includes(o.status));
    if (allDone && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, [orders]);

  const formatTime = (d?: string) =>
    d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

  const activeOrder = orders.find(o => !['COMPLETED', 'CANCELLED'].includes(o.status)) || orders[0];

  if (loading) {
    return (
      <View style={s.container}>
        <StarlightBackground />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#f5dd4b" />
          <Text style={s.loadingText}>Loading your order…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Order Tracking</Text>
          {tableNumber
            ? <Text style={s.headerSub}>Table {tableNumber} · {venueName}</Text>
            : venueName && <Text style={s.headerSub}>{venueName}</Text>
          }
        </View>
        <TouchableOpacity style={s.addMoreBtn}
          onPress={() => navigation.navigate('Menu', { bookingId, venueId: activeOrder?.bookingId, venueName, tableNumber })}>
          <Ionicons name="add" size={20} color="#f5dd4b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)}
            tintColor="#f5dd4b" colors={['#f5dd4b']} />
        }>
        {orders.length === 0 ? (
          <View style={s.centered}>
            <Ionicons name="receipt-outline" size={64} color="#333" />
            <Text style={s.emptyTitle}>No orders yet</Text>
            <Text style={s.emptySub}>Place an order from the menu</Text>
            <TouchableOpacity style={s.menuBtn}
              onPress={() => navigation.navigate('Menu', { bookingId, venueName, tableNumber })}>
              <Text style={s.menuBtnText}>Browse Menu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeOrder && <ActiveOrderCard order={activeOrder} formatTime={formatTime} />}

            {orders.length > 1 && (
              <>
                <Text style={s.sectionTitle}>All Orders This Session</Text>
                {orders.map(order => (
                  <OrderSummaryCard key={order.id} order={order} formatTime={formatTime} />
                ))}
              </>
            )}

            {activeOrder && !['COMPLETED', 'CANCELLED'].includes(activeOrder.status) && (
              <TouchableOpacity style={s.addMoreCard}
                onPress={() => navigation.navigate('Menu', { bookingId, venueName, tableNumber })}
                activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={22} color="#f5dd4b" />
                <Text style={s.addMoreText}>Add more items to this order</Text>
                <Ionicons name="arrow-forward" size={18} color="#f5dd4b" />
              </TouchableOpacity>
            )}

            <Text style={s.pollingNote}>Auto-refreshing every 15s</Text>
          </>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function ActiveOrderCard({ order, formatTime }: { order: Order; formatTime: (d?: string) => string }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['CREATED'];
  const currentIdx = STATUS_PIPELINE.indexOf(order.status);

  return (
    <View style={ac.card}>
      <View style={[ac.statusHero, { backgroundColor: cfg.color + '15', borderColor: cfg.color + '30' }]}>
        <View style={[ac.statusIconWrap, { backgroundColor: cfg.color + '20' }]}>
          <Ionicons name={cfg.icon} size={32} color={cfg.color} />
        </View>
        <Text style={[ac.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={ac.statusDesc}>{cfg.description}</Text>
      </View>

      {order.status !== 'CANCELLED' && (
        <View style={ac.timeline}>
          {STATUS_PIPELINE.map((step, i) => {
            const stepCfg = STATUS_CONFIG[step];
            const isDone    = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isLast    = i === STATUS_PIPELINE.length - 1;
            return (
              <View key={step} style={ac.timelineStep}>
                <View style={ac.timelineLeft}>
                  <View style={[
                    ac.timelineDot,
                    isDone    && { backgroundColor: '#00C851', borderColor: '#00C851' },
                    isCurrent && { backgroundColor: cfg.color,  borderColor: cfg.color  },
                  ]}>
                    {isDone    && <Ionicons name="checkmark" size={10} color="#fff" />}
                    {isCurrent && <View style={[ac.timelineDotInner, { backgroundColor: cfg.color }]} />}
                  </View>
                  {!isLast && <View style={[ac.timelineLine, isDone && { backgroundColor: '#00C851' }]} />}
                </View>
                <Text style={[
                  ac.timelineLabel,
                  isDone    && { color: '#00C851' },
                  isCurrent && { color: cfg.color, fontWeight: '700' },
                ]}>
                  {stepCfg?.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={ac.itemsSection}>
        <Text style={ac.itemsTitle}>Items ({order.items?.length || 0})</Text>
        {order.items?.map((item, i) => (
          <View key={i} style={ac.itemRow}>
            <Text style={ac.itemQty}>{item.quantity}×</Text>
            <Text style={ac.itemName}>{item.name}</Text>
            <Text style={ac.itemPrice}>₦{(item.price * item.quantity).toLocaleString()}</Text>
          </View>
        ))}
        <View style={ac.totalRow}>
          <Text style={ac.totalLabel}>Total</Text>
          <Text style={ac.totalValue}>₦{Number(order.totalAmount).toLocaleString()}</Text>
        </View>
      </View>
      <Text style={ac.orderMeta}>Order #{order.id?.slice(0, 8).toUpperCase()} · {formatTime(order.createdAt)}</Text>
    </View>
  );
}

function OrderSummaryCard({ order, formatTime }: { order: Order; formatTime: (d?: string) => string }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['CREATED'];
  return (
    <View style={os.card}>
      <View style={os.topRow}>
        <View style={[os.statusDot, { backgroundColor: cfg.color }]} />
        <Text style={os.statusLabel}>{cfg.label}</Text>
        <Text style={os.time}>{formatTime(order.createdAt)}</Text>
      </View>
      <Text style={os.itemsSummary}>{order.items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}</Text>
      <Text style={os.total}>₦{Number(order.totalAmount).toLocaleString()}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#000' },
  backBtn:     { position: 'absolute', top: 54, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 12 },
  iconBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerCenter:{ alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub:   { fontSize: 12, color: '#888', marginTop: 2 },
  addMoreBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,221,75,0.1)', borderWidth: 1, borderColor: 'rgba(245,221,75,0.3)', justifyContent: 'center', alignItems: 'center' },
  scroll:      { flex: 1 },
  centered:    { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  loadingText: { color: '#888', marginTop: 12, fontSize: 14 },
  emptyTitle:  { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySub:    { color: '#666', fontSize: 14, marginTop: 8 },
  menuBtn:     { marginTop: 20, backgroundColor: '#f5dd4b', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  menuBtnText: { color: '#000', fontSize: 15, fontWeight: 'bold' },
  sectionTitle:{ color: '#888', fontSize: 13, fontWeight: '600', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10 },
  addMoreCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(245,221,75,0.07)', borderRadius: 14, marginHorizontal: 20, marginTop: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(245,221,75,0.2)' },
  addMoreText: { color: '#f5dd4b', fontSize: 14, fontWeight: '600', flex: 1 },
  pollingNote: { color: '#333', fontSize: 11, textAlign: 'center', marginTop: 16 },
});

const ac = StyleSheet.create({
  card:           { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, marginHorizontal: 20, marginTop: 16, padding: 20, borderWidth: 1, borderColor: '#1a1a1a' },
  statusHero:     { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24, borderWidth: 1 },
  statusIconWrap: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statusLabel:    { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  statusDesc:     { color: '#888', fontSize: 13, textAlign: 'center' },
  timeline:       { marginBottom: 24 },
  timelineStep:   { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft:   { alignItems: 'center', width: 24, marginRight: 14 },
  timelineDot:    { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#333', backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  timelineDotInner: { width: 8, height: 8, borderRadius: 4 },
  timelineLine:   { width: 2, height: 28, backgroundColor: '#222', marginVertical: 2 },
  timelineLabel:  { color: '#555', fontSize: 13, paddingTop: 2, paddingBottom: 28 },
  itemsSection:   { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 16 },
  itemsTitle:     { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  itemRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemQty:        { color: '#555', fontSize: 13, width: 28 },
  itemName:       { color: '#fff', fontSize: 14, flex: 1 },
  itemPrice:      { color: '#888', fontSize: 13 },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  totalLabel:     { color: '#fff', fontSize: 15, fontWeight: '600' },
  totalValue:     { color: '#f5dd4b', fontSize: 17, fontWeight: 'bold' },
  orderMeta:      { color: '#444', fontSize: 11, textAlign: 'center', marginTop: 16 },
});

const os = StyleSheet.create({
  card:        { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, marginHorizontal: 20, marginBottom: 10, padding: 16, borderWidth: 1, borderColor: '#1a1a1a' },
  topRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot:   { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusLabel: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  time:        { color: '#555', fontSize: 12 },
  itemsSummary:{ color: '#666', fontSize: 12, marginBottom: 6, lineHeight: 18 },
  total:       { color: '#f5dd4b', fontSize: 14, fontWeight: 'bold' },
});