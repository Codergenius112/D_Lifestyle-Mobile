import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, TextInput, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StarlightBackground from '../../components/StarlightBackground';
import { useStore } from '../../store/useStore';
import apiClient from '../../services/api';

interface WalletData {
  id: string;
  balance: number;
  currency: string;
  lastTransactionAt?: string;
}

interface LedgerEntry {
  id: string;
  transactionType: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  createdAt: string;
}

export default function WalletScreen({ navigation }: any) {
  const user = useStore((state) => state.user);
  const walletBalance = useStore((state) => state.walletBalance);
  const setWalletBalance = useStore((state) => state.setWalletBalance);

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topping, setTopping] = useState(false);

  const fetchWallet = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // GET /wallet — backend WalletService.getWallet(userId) auto-creates if missing
      const walletRes = await apiClient.get('/wallet');
      setWallet(walletRes.data);
      setWalletBalance(Number(walletRes.data.balance) || 0);

      // GET /wallet/transactions — ledger entries for this user
      try {
        const txRes = await apiClient.get('/wallet/transactions');
        setTransactions(txRes.data?.entries || txRes.data || []);
      } catch {
        // Ledger endpoint may not be exposed; gracefully degrade
        setTransactions([]);
      }
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setWalletBalance]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (amount < 100) {
      Alert.alert('Error', 'Minimum top-up is ₦100');
      return;
    }

    /**
     * Top-up flow (Paystack only — no Stripe per business rules):
     * 1. Launch Paystack SDK to collect payment
     * 2. On success, send reference to backend POST /payments/topup
     * 3. Backend credits wallet and creates ledger entry
     *
     * For now we show the Paystack integration note.
     */
    Alert.alert(
      'Top Up via Paystack',
      `To add ₦${amount.toLocaleString()} to your wallet:\n\n1. You will be redirected to Paystack\n2. Complete payment\n3. Wallet is credited automatically\n\nPaystack SDK integration required (react-native-paystack-webview).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: () => {
            setShowTopUpModal(false);
            setTopUpAmount('');
            // TODO: Launch Paystack WebView here with amount
            // On success: call POST /payments { bookingId: null, amount, method: 'paystack', paystackReference }
          },
        },
      ],
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const QUICK_AMOUNTS = [1000, 5000, 10000, 20000, 50000];

  return (
    <View style={styles.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchWallet(true)}
            tintColor="#f5dd4b" colors={['#f5dd4b']} />
        }
      >
        {/* Balance card */}
        <LinearGradient
          colors={['#1a1a00', '#2a2500', '#f5dd4b20']}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.balanceIconRow}>
            <Ionicons name="wallet" size={28} color="#f5dd4b" />
            <Text style={styles.currencyLabel}>NGN Wallet</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#f5dd4b" style={{ marginVertical: 20 }} />
          ) : (
            <>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>
                ₦{(wallet?.balance || walletBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </Text>
            </>
          )}
          <View style={styles.walletNote}>
            <Ionicons name="lock-closed" size={12} color="#888" />
            <Text style={styles.walletNoteText}>Closed-loop wallet · Internal use only</Text>
          </View>
        </LinearGradient>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}
            onPress={() => setShowTopUpModal(true)}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,200,81,0.15)' }]}>
              <Ionicons name="add-circle" size={28} color="#00C851" />
            </View>
            <Text style={styles.actionLabel}>Top Up</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}
            onPress={() => navigation.navigate('Bookings')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(245,221,75,0.15)' }]}>
              <Ionicons name="receipt" size={28} color="#f5dd4b" />
            </View>
            <Text style={styles.actionLabel}>Pay Booking</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => fetchWallet(true)}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,188,212,0.15)' }]}>
              <Ionicons name="refresh" size={28} color="#00bcd4" />
            </View>
            <Text style={styles.actionLabel}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={16} color="#f5dd4b" />
          <Text style={styles.infoText}>
            Wallet funds can only be used for bookings within the D'Lifestyle platform.
            No external withdrawals.
          </Text>
        </View>

        {/* Transaction history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {loading ? (
            <ActivityIndicator color="#f5dd4b" style={{ marginTop: 20 }} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <Ionicons name="receipt-outline" size={40} color="#444" />
              <Text style={styles.emptyTxText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.txCard}>
                <View style={[styles.txIcon,
                  { backgroundColor: tx.transactionType === 'CREDIT'
                    ? 'rgba(0,200,81,0.1)' : 'rgba(255,68,68,0.1)' }]}>
                  <Ionicons
                    name={tx.transactionType === 'CREDIT' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={tx.transactionType === 'CREDIT' ? '#00C851' : '#ff4444'}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                </View>
                <Text style={[styles.txAmount,
                  { color: tx.transactionType === 'CREDIT' ? '#00C851' : '#ff4444' }]}>
                  {tx.transactionType === 'CREDIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Top-up modal */}
      <Modal visible={showTopUpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={() => setShowTopUpModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Powered by Paystack · Cards, Bank, USSD</Text>

            <View style={styles.amountInputContainer}>
              <Text style={styles.nairaSymbol}>₦</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#666"
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.quickLabel}>Quick amounts</Text>
            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((amt) => (
                <TouchableOpacity key={amt} style={styles.quickChip}
                  onPress={() => setTopUpAmount(amt.toString())}>
                  <Text style={styles.quickChipText}>₦{(amt / 1000)}k</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.topUpButton, topping && { opacity: 0.6 }]}
              onPress={handleTopUp} disabled={topping} activeOpacity={0.8}>
              <LinearGradient colors={['#f5dd4b', '#d4a017']} style={styles.topUpGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {topping ? <ActivityIndicator color="#111" /> : (
                  <Text style={styles.topUpButtonText}>
                    Top Up {topUpAmount ? `₦${parseFloat(topUpAmount).toLocaleString()}` : ''}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 20,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  balanceCard: {
    marginHorizontal: 20, borderRadius: 20, padding: 24, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(245,221,75,0.2)',
  },
  balanceIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  currencyLabel: { color: '#888', fontSize: 14, marginLeft: 10 },
  balanceLabel: { color: '#888', fontSize: 14, marginBottom: 8 },
  balanceAmount: { color: '#f5dd4b', fontSize: 40, fontWeight: 'bold', marginBottom: 16 },
  walletNote: { flexDirection: 'row', alignItems: 'center' },
  walletNoteText: { color: '#666', fontSize: 11, marginLeft: 6 },
  actions: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 20, marginBottom: 20,
  },
  actionButton: { alignItems: 'center' },
  actionIcon: {
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  actionLabel: { color: '#888', fontSize: 12 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(245,221,75,0.07)', borderRadius: 10,
    marginHorizontal: 20, padding: 14, marginBottom: 24,
  },
  infoText: { color: '#999', fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 18 },
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  emptyTx: { alignItems: 'center', paddingVertical: 40 },
  emptyTxText: { color: '#666', fontSize: 14, marginTop: 12 },
  txCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  txIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  txInfo: { flex: 1 },
  txDesc: { color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 3 },
  txDate: { color: '#666', fontSize: 11 },
  txAmount: { fontSize: 15, fontWeight: 'bold' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  modalSubtitle: { color: '#666', fontSize: 13, marginBottom: 24 },
  amountInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    paddingHorizontal: 16, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(245,221,75,0.3)',
  },
  nairaSymbol: { color: '#f5dd4b', fontSize: 28, fontWeight: 'bold', marginRight: 8 },
  amountInput: { flex: 1, color: '#fff', fontSize: 28, fontWeight: 'bold', paddingVertical: 16 },
  quickLabel: { color: '#888', fontSize: 13, marginBottom: 10 },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  quickChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(245,221,75,0.1)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(245,221,75,0.2)',
  },
  quickChipText: { color: '#f5dd4b', fontSize: 13, fontWeight: '600' },
  topUpButton: { borderRadius: 12, overflow: 'hidden' },
  topUpGradient: { paddingVertical: 18, alignItems: 'center' },
  topUpButtonText: { color: '#111', fontSize: 18, fontWeight: 'bold' },
});