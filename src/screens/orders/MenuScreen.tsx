/**
 * Route: Menu
 * Params: { bookingId, venueId, venueName, tableNumber? }
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StarlightBackground from '../../components/StarlightBackground';
import { menuAPI, ordersAPI } from '../../services/api';
import type { MenuItem, OrderItem } from '../../services/api';

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  food:      { label: 'Food',      icon: 'fast-food-outline',  color: '#ff6b35' },
  drinks:    { label: 'Drinks',    icon: 'beer-outline',       color: '#00bcd4' },
  cocktails: { label: 'Cocktails', icon: 'wine-outline',       color: '#e91e8c' },
  bottles:   { label: 'Bottles',   icon: 'wine',               color: '#f5dd4b' },
  desserts:  { label: 'Desserts',  icon: 'ice-cream-outline',  color: '#ff9800' },
  extras:    { label: 'Extras',    icon: 'add-circle-outline', color: '#888'    },
};

interface CartItem extends OrderItem { itemName: string; }

export default function MenuScreen({ route, navigation }: any) {
  const { bookingId, venueId, venueName, tableNumber } = route.params || {};

  const [items, setItems]               = useState<MenuItem[]>([]);
  const [categories, setCategories]     = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart]                 = useState<Map<string, CartItem>>(new Map());
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [orderNote, setOrderNote]       = useState('');
  const [showCart, setShowCart]         = useState(false);

  const fetchMenu = useCallback(async () => {
    if (!venueId) return;
    try {
      setLoading(true);
      const res = await menuAPI.getMenu(venueId);
      setItems(res.items || []);
      setCategories(res.categories || []);
    } catch {
      Alert.alert('Error', 'Could not load the menu. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const cartArray = Array.from(cart.values());
  const cartTotal = cartArray.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cartArray.reduce((sum, i) => sum + i.quantity, 0);
  const getQty = (id: string) => cart.get(id)?.quantity || 0;

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        next.set(item.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(item.id, { itemId: item.id, itemName: item.name, name: item.name, quantity: 1, price: Number(item.price) });
      }
      return next;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) next.delete(itemId);
      else next.set(itemId, { ...existing, quantity: existing.quantity - 1 });
      return next;
    });
  };

  const handlePlaceOrder = async () => {
    if (cart.size === 0) { Alert.alert('Empty Cart', 'Add some items before placing your order.'); return; }
    if (!bookingId) { Alert.alert('Error', 'No booking found. Please go back and try again.'); return; }
    try {
      setSubmitting(true);
      const orderItems: OrderItem[] = cartArray.map(({ itemId, name, quantity, price, specialInstructions }) => ({
        itemId, name, quantity, price, specialInstructions,
      }));
      const order = await ordersAPI.createOrder({
        bookingId, items: orderItems, notes: orderNote.trim() || undefined,
      });
      setCart(new Map()); setOrderNote(''); setShowCart(false);
      navigation.replace('OrderTracking', { orderId: order.id, bookingId, tableNumber, venueName });
    } catch (err: any) {
      Alert.alert('Order Failed', err?.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);
  const grouped = (activeCategory === 'all' ? categories : [activeCategory]).reduce<Record<string, MenuItem[]>>((acc, cat) => {
    const catItems = filtered.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  // ── Cart sheet ──
  if (showCart) {
    return (
      <View style={s.container}>
        <StarlightBackground />
        <StatusBar barStyle="light-content" />
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setShowCart(false)}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Your Order</Text>
          <View style={s.iconBtn} />
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {tableNumber && (
            <View style={s.tableTag}>
              <Ionicons name="restaurant" size={14} color="#f5dd4b" />
              <Text style={s.tableTagText}>Table {tableNumber} · {venueName}</Text>
            </View>
          )}
          {cartArray.map(item => (
            <View key={item.itemId} style={s.cartItem}>
              <View style={s.cartItemInfo}>
                <Text style={s.cartItemName}>{item.name}</Text>
                <Text style={s.cartItemPrice}>₦{(item.price * item.quantity).toLocaleString()}</Text>
              </View>
              <View style={s.qtyRow}>
                <TouchableOpacity style={s.qtyBtn} onPress={() => removeFromCart(item.itemId)}>
                  <Ionicons name="remove" size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={s.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={s.qtyBtn} onPress={() => { const mi = items.find(i => i.id === item.itemId); if (mi) addToCart(mi); }}>
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <Text style={s.label}>Special instructions (optional)</Text>
          <View style={s.noteInput}>
            <TextInput style={s.noteText} placeholder="E.g. no onions, extra spicy…" placeholderTextColor="#555"
              value={orderNote} onChangeText={setOrderNote} multiline maxLength={200} />
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Order Summary</Text>
            {cartArray.map(item => (
              <View key={item.itemId} style={s.summaryRow}>
                <Text style={s.summaryLabel}>{item.quantity}× {item.name}</Text>
                <Text style={s.summaryValue}>₦{(item.price * item.quantity).toLocaleString()}</Text>
              </View>
            ))}
            <View style={s.divider} />
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: '#fff', fontWeight: '700' }]}>Total</Text>
              <Text style={[s.summaryValue, { color: '#f5dd4b', fontSize: 18, fontWeight: 'bold' }]}>₦{cartTotal.toLocaleString()}</Text>
            </View>
          </View>
          <TouchableOpacity style={[s.placeOrderBtn, submitting && { opacity: 0.6 }]}
            onPress={handlePlaceOrder} disabled={submitting} activeOpacity={0.85}>
            <LinearGradient colors={['#f5dd4b', '#d4a017']} style={s.placeOrderGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {submitting ? <ActivityIndicator color="#111" /> : <Text style={s.placeOrderText}>Place Order · ₦{cartTotal.toLocaleString()}</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Main menu view ──
  return (
    <View style={s.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Menu</Text>
          {venueName && <Text style={s.headerSub}>{venueName}</Text>}
        </View>
        <TouchableOpacity style={s.cartIconBtn} onPress={() => cartCount > 0 && setShowCart(true)}>
          <Ionicons name="cart-outline" size={24} color={cartCount > 0 ? '#f5dd4b' : '#555'} />
          {cartCount > 0 && (
            <View style={s.cartBadge}><Text style={s.cartBadgeText}>{cartCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {['all', ...categories].map(cat => {
          const meta = CATEGORY_META[cat];
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity key={cat} style={[s.tab, isActive && s.tabActive]} onPress={() => setActiveCategory(cat)}>
              {meta && <Ionicons name={meta.icon} size={14} color={isActive ? '#000' : '#888'} />}
              <Text style={[s.tabText, isActive && s.tabTextActive]}>
                {cat === 'all' ? 'All' : meta?.label || cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.centered}><ActivityIndicator size="large" color="#f5dd4b" /></View>
        ) : items.length === 0 ? (
          <View style={s.centered}>
            <Ionicons name="fast-food-outline" size={64} color="#333" />
            <Text style={s.emptyTitle}>Menu not available</Text>
          </View>
        ) : (
          <>
            {Object.entries(grouped).map(([cat, catItems]) => {
              const meta = CATEGORY_META[cat];
              return (
                <View key={cat}>
                  <View style={s.sectionHeader}>
                    {meta && <Ionicons name={meta.icon} size={16} color={meta.color} />}
                    <Text style={[s.sectionTitle, { color: meta?.color || '#888' }]}>{meta?.label || cat}</Text>
                  </View>
                  {catItems.map(item => {
                    const qty = getQty(item.id);
                    return (
                      <View key={item.id} style={s.itemCard}>
                        <View style={s.itemInfo}>
                          <Text style={s.itemName}>{item.name}</Text>
                          {!!item.description && <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text>}
                          <Text style={s.itemPrice}>₦{Number(item.price).toLocaleString()}</Text>
                        </View>
                        {qty === 0 ? (
                          <TouchableOpacity style={s.addBtn} onPress={() => addToCart(item)}>
                            <Ionicons name="add" size={20} color="#000" />
                          </TouchableOpacity>
                        ) : (
                          <View style={s.qtyControls}>
                            <TouchableOpacity style={s.qtyCtrlBtn} onPress={() => removeFromCart(item.id)}>
                              <Ionicons name="remove" size={16} color="#fff" />
                            </TouchableOpacity>
                            <Text style={s.qtyCtrlText}>{qty}</Text>
                            <TouchableOpacity style={s.qtyCtrlBtn} onPress={() => addToCart(item)}>
                              <Ionicons name="add" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <View style={{ height: 120 }} />
          </>
        )}
      </ScrollView>

      {cartCount > 0 && (
        <TouchableOpacity style={s.floatingCart} onPress={() => setShowCart(true)} activeOpacity={0.9}>
          <LinearGradient colors={['#f5dd4b', '#d4a017']} style={s.floatingCartGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={s.floatingCartLeft}>
              <View style={s.floatingCartBadge}><Text style={s.floatingCartBadgeText}>{cartCount}</Text></View>
              <Text style={s.floatingCartLabel}>View Order</Text>
            </View>
            <Text style={s.floatingCartTotal}>₦{cartTotal.toLocaleString()}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  cartIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ff4444', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  tabsScroll: { maxHeight: 52 },
  tabsContent: { paddingHorizontal: 20, gap: 8, alignItems: 'center', paddingVertical: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: '#222' },
  tabActive: { backgroundColor: '#f5dd4b', borderColor: '#f5dd4b' },
  tabText: { color: '#888', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#000' },
  scroll: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, marginHorizontal: 20, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#1a1a1a', gap: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  itemDesc: { color: '#666', fontSize: 12, marginBottom: 6, lineHeight: 16 },
  itemPrice: { color: '#f5dd4b', fontSize: 15, fontWeight: 'bold' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5dd4b', justifyContent: 'center', alignItems: 'center' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyCtrlBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  qtyCtrlText: { color: '#fff', fontSize: 15, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
  floatingCart: { position: 'absolute', bottom: 30, left: 20, right: 20, borderRadius: 16, overflow: 'hidden' },
  floatingCartGradient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  floatingCartLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  floatingCartBadge: { backgroundColor: '#000', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  floatingCartBadgeText: { color: '#f5dd4b', fontSize: 12, fontWeight: 'bold' },
  floatingCartLabel: { color: '#000', fontSize: 15, fontWeight: 'bold' },
  floatingCartTotal: { color: '#000', fontSize: 15, fontWeight: 'bold' },
  tableTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,221,75,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 20 },
  tableTagText: { color: '#f5dd4b', fontSize: 13, fontWeight: '600' },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  cartItemInfo: { flex: 1 },
  cartItemName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cartItemPrice: { color: '#f5dd4b', fontSize: 14, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  qtyText: { color: '#fff', fontSize: 16, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
  label: { color: '#888', fontSize: 13, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  noteInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24, minHeight: 72 },
  noteText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  summaryCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 24 },
  summaryTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { color: '#888', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  placeOrderBtn: { borderRadius: 14, overflow: 'hidden' },
  placeOrderGradient: { paddingVertical: 18, alignItems: 'center' },
  placeOrderText: { color: '#000', fontSize: 17, fontWeight: 'bold' },
});