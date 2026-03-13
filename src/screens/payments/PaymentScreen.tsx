/**
 * PaymentScreen
 * Route: Payment
 * Params: { bookingId, totalAmount, bookingType }
 *
 * Two payment methods:
 *  1. Wallet  — POST /payments { bookingId, amount, method: 'wallet' }
 *  2. Paystack — opens Paystack WebView → on success POST /payments
 *                { bookingId, amount, method: 'paystack', paystackReference }
 *
 * Business rules:
 *  - totalAmount already includes ₦400 service charge (added at booking screen)
 *  - Platform commission 3% is venue-paid, never shown to user
 *  - On FULLY_PAID → booking auto-confirms on the backend
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PaystackProvider, usePaystack } from 'react-native-paystack-webview';
import StarlightBackground from '../../components/StarlightBackground';
import { useStore } from '../../store/useStore';
import { paymentsAPI } from '../../services/api';

// ── Your Paystack public key ───────────────────────────────────────────────────
const PAYSTACK_PUBLIC_KEY = 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// ── Inner component that uses the usePaystack hook ────────────────────────────
function PaymentScreenInner({ route, navigation }: any) {
  const { bookingId, totalAmount, bookingType } = route.params;

  const user = useStore((state) => state.user);
  const walletBalance = useStore((state) => state.walletBalance);
  const setWalletBalance = useStore((state) => state.setWalletBalance);
  const updateBooking = useStore((state) => state.updateBooking);

  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'paystack' | null>(null);
  const [loading, setLoading] = useState(false);

  const { popup } = usePaystack();

  const canUseWallet = walletBalance >= totalAmount;

  // ── Shared: record payment on backend after method succeeds ─────────────────
  const recordPayment = async (method: 'wallet' | 'paystack', paystackReference?: string) => {
    try {
      setLoading(true);

      const payment = await paymentsAPI.processPayment({
        bookingId,
        amount: totalAmount,
        method,
        ...(paystackReference ? { paystackReference } : {}),
      });

      if (method === 'wallet') {
        setWalletBalance(Math.max(0, walletBalance - totalAmount));
      }

      if (payment.status === 'FULLY_PAID') {
        updateBooking(bookingId, { status: 'CONFIRMED', paymentStatus: 'FULLY_PAID' });
      }

      Alert.alert(
        '🎉 Payment Successful',
        `Your booking is confirmed.\nAmount paid: ₦${totalAmount.toLocaleString()}`,
        [{ text: 'View Bookings', onPress: () => navigation.navigate('Bookings') }],
      );
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Payment failed. Please try again.';
      Alert.alert('Payment Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Wallet payment ───────────────────────────────────────────────────────────
  const handleWalletPay = async () => {
    await recordPayment('wallet');
  };

  // ── Paystack: launch payment sheet ──────────────────────────────────────────
  const handlePaystackPay = () => {
    popup.checkout({
      email: user?.email || 'user@dlifestyle.app',
      amount: totalAmount,
      reference: `dlf-${bookingId}-${Date.now()}`,
      onSuccess: async (response) => {
        const res = response as any;
        const reference = res?.transactionRef || res?.reference || res?.data?.reference || '';
        await recordPayment('paystack', reference);
      },
      onCancel: () => {
        Alert.alert('Payment Cancelled', 'You cancelled the Paystack payment.');
      },
    });
  };

  // ── Main pay button handler ──────────────────────────────────────────────────
  const handlePay = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Method', 'Please choose a payment method first.');
      return;
    }
    if (selectedMethod === 'wallet') {
      await handleWalletPay();
    } else {
      handlePaystackPay();
    }
  };

  return (
    <View style={styles.container}>
      <StarlightBackground />

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Complete Payment</Text>
        <Text style={styles.subtitle}>
          {bookingType?.charAt(0).toUpperCase() + bookingType?.slice(1)} · Booking{' '}
          {bookingId?.slice(0, 8)}...
        </Text>

        {/* Amount card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount Due</Text>
          <Text style={styles.amountValue}>₦{totalAmount?.toLocaleString()}</Text>
          <Text style={styles.amountNote}>Includes ₦400 non-refundable service charge</Text>
        </View>

        {/* Payment methods */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {/* Wallet */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            selectedMethod === 'wallet' && styles.methodCardSelected,
            !canUseWallet && styles.methodCardDisabled,
          ]}
          onPress={() => canUseWallet && setSelectedMethod('wallet')}
          disabled={!canUseWallet}
          activeOpacity={0.8}
        >
          <View style={styles.methodLeft}>
            <View style={styles.methodIcon}>
              <Ionicons name="wallet" size={24} color="#f5dd4b" />
            </View>
            <View>
              <Text style={styles.methodName}>Wallet Balance</Text>
              <Text style={[styles.methodSub, !canUseWallet && { color: '#ff4444' }]}>
                ₦{walletBalance.toLocaleString()}
                {!canUseWallet ? ' — Insufficient' : ' available'}
              </Text>
            </View>
          </View>
          {selectedMethod === 'wallet' && (
            <Ionicons name="checkmark-circle" size={24} color="#f5dd4b" />
          )}
        </TouchableOpacity>

        {/* Paystack */}
        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'paystack' && styles.methodCardSelected]}
          onPress={() => setSelectedMethod('paystack')}
          activeOpacity={0.8}
        >
          <View style={styles.methodLeft}>
            <View style={[styles.methodIcon, { backgroundColor: 'rgba(0,200,81,0.1)' }]}>
              <Ionicons name="card" size={24} color="#00C851" />
            </View>
            <View>
              <Text style={styles.methodName}>Paystack</Text>
              <Text style={styles.methodSub}>Card · Bank Transfer · USSD</Text>
            </View>
          </View>
          {selectedMethod === 'paystack' && (
            <Ionicons name="checkmark-circle" size={24} color="#f5dd4b" />
          )}
        </TouchableOpacity>

        {/* Wallet top-up notice */}
        {!canUseWallet && (
          <View style={styles.notice}>
            <Ionicons name="information-circle" size={16} color="#f5dd4b" />
            <Text style={styles.noticeText}>
              Your wallet balance is insufficient. Use Paystack to pay directly or top up your
              wallet first.
            </Text>
          </View>
        )}

        {/* Pay button */}
        <TouchableOpacity
          style={[styles.payBtn, (!selectedMethod || loading) && { opacity: 0.5 }]}
          onPress={handlePay}
          disabled={!selectedMethod || loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#f5dd4b', '#d4a017']} style={styles.payGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading
              ? <ActivityIndicator color="#111" />
              : <Text style={styles.payBtnText}>Pay ₦{totalAmount?.toLocaleString()}</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Wrap with PaystackProvider so usePaystack hook works ──────────────────────
export default function PaymentScreen({ route, navigation }: any) {
  return (
    <PaystackProvider publicKey={PAYSTACK_PUBLIC_KEY} currency="NGN">
      <PaymentScreenInner route={route} navigation={navigation} />
    </PaystackProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backButton: {
    position: 'absolute', top: 54, left: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  content: { padding: 20, paddingTop: 110 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', marginBottom: 28 },
  amountCard: {
    backgroundColor: 'rgba(245,221,75,0.08)', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 32,
    borderWidth: 1, borderColor: 'rgba(245,221,75,0.25)',
  },
  amountLabel: { color: '#888', fontSize: 14, marginBottom: 8 },
  amountValue: { color: '#f5dd4b', fontSize: 42, fontWeight: 'bold' },
  amountNote: { color: '#666', fontSize: 11, marginTop: 8, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 16 },
  methodCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 2, borderColor: 'transparent',
  },
  methodCardSelected: { borderColor: '#f5dd4b', backgroundColor: 'rgba(245,221,75,0.06)' },
  methodCardDisabled: { opacity: 0.4 },
  methodLeft: { flexDirection: 'row', alignItems: 'center' },
  methodIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(245,221,75,0.1)',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  methodName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 3 },
  methodSub: { fontSize: 13, color: '#888' },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(245,221,75,0.07)', borderRadius: 10,
    padding: 14, marginBottom: 24, gap: 10,
  },
  noticeText: { color: '#f5dd4b', fontSize: 12, flex: 1, lineHeight: 18 },
  payBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  payGradient: { paddingVertical: 18, alignItems: 'center' },
  payBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
});