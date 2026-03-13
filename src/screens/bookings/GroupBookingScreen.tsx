import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StarlightBackground from '../../components/StarlightBackground';
import { useStore } from '../../store/useStore';
import { bookingsAPI, paymentsAPI, SERVICE_CHARGE } from '../../services/api';
import type { BackendBooking } from '../../services/api';

/**
 * Group Booking Flow:
 * 1. Initiator enters participant IDs (or emails — backend uses IDs)
 * 2. POST /bookings → group variant → status: PENDING_GROUP_PAYMENT
 * 3. Backend starts 8-minute countdown (GroupBookingCountdownService)
 * 4. Each participant contributes via POST /payments
 * 5. When totalAmount reached → status: CONFIRMED
 *
 * Business rules enforced:
 *   - Countdown: 8 minutes fixed (480 seconds)
 *   - Total = basePrice + ₦400 service charge
 *   - Platform commission (3%) is NOT shown to participants
 */

const COUNTDOWN_SECONDS = 8 * 60; // 8 minutes per business rules

export default function GroupBookingScreen({ route, navigation }: any) {
  const { eventId, bookingType, selectedItem, quantity, totalAmount, basePrice } = route.params || {};
  const user = useStore((state) => state.user);
  const addBooking = useStore((state) => state.addBooking);
  const walletBalance = useStore((state) => state.walletBalance);
  const setWalletBalance = useStore((state) => state.setWalletBalance);

  const [step, setStep] = useState<'setup' | 'countdown' | 'payment'>('setup');
  const [participantIds, setParticipantIds] = useState<string[]>(['']);
  const [booking, setBooking] = useState<BackendBooking | null>(null);
  const [initiating, setInitiating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [myContribution, setMyContribution] = useState('');
  const [totalContributed, setTotalContributed] = useState(0);

  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Start countdown when booking is created
  useEffect(() => {
    if (step === 'countdown') {
      countdownInterval.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current!);
            // Countdown expired — booking will expire on backend too
            Alert.alert(
              'Time Expired',
              'The 8-minute group payment window has closed. Please start a new booking.',
              [{ text: 'OK', onPress: () => navigation.goBack() }],
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: COUNTDOWN_SECONDS * 1000,
        useNativeDriver: false,
      }).start();
    }
    return () => { if (countdownInterval.current) clearInterval(countdownInterval.current); };
  }, [step, progressAnim, navigation]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const addParticipant = () => {
    if (participantIds.length >= 9) {
      Alert.alert('Limit', 'Maximum 10 participants including yourself');
      return;
    }
    setParticipantIds([...participantIds, '']);
  };

  const updateParticipant = (index: number, value: string) => {
    const updated = [...participantIds];
    updated[index] = value;
    setParticipantIds(updated);
  };

  const removeParticipant = (index: number) => {
    setParticipantIds(participantIds.filter((_, i) => i !== index));
  };

  const handleInitiateGroupBooking = async () => {
    const validParticipants = participantIds.filter((id) => id.trim().length > 0);
    if (validParticipants.length === 0) {
      Alert.alert('Error', 'Please add at least one participant');
      return;
    }

    try {
      setInitiating(true);
      // POST /bookings with isGroup:true, participantIds
      // Backend creates BookingStatus.PENDING_GROUP_PAYMENT + 8-min countdown
      const newBooking = await bookingsAPI.createGroupBooking({
        bookingType,
        resourceId: selectedItem?.id || '',
        basePrice: basePrice || 0,
        guestCount: quantity || 1,
        participantIds: validParticipants,
        metadata: { selectedItem, quantity },
      });

      setBooking(newBooking);
      addBooking(newBooking);
      setStep('countdown');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to initiate group booking';
      Alert.alert('Error', msg);
    } finally {
      setInitiating(false);
    }
  };

  const handleMyContribution = async () => {
    if (!booking) return;
    const amount = parseFloat(myContribution);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Enter a valid contribution amount');
      return;
    }
    if (amount > walletBalance) {
      Alert.alert('Insufficient Balance', `Your wallet balance is ₦${walletBalance.toLocaleString()}`);
      return;
    }

    try {
      setPaying(true);
      // POST /payments → { bookingId, amount, method: 'wallet' }
      const payment = await paymentsAPI.processPayment({
        bookingId: booking.id,
        amount,
        method: 'wallet',
      });

      const newTotal = totalContributed + amount;
      setTotalContributed(newTotal);
      setWalletBalance(walletBalance - amount);
      setMyContribution('');

      if (payment.status === 'FULLY_PAID') {
        clearInterval(countdownInterval.current!);
        Alert.alert(
          'Booking Confirmed! 🎉',
          'All payments received. Your group booking is confirmed!',
          [{ text: 'View Booking', onPress: () => navigation.navigate('Bookings') }],
        );
      } else {
        Alert.alert(
          'Contribution Recorded',
          `₦${amount.toLocaleString()} contributed. ₦${Math.max(0, (totalAmount || 0) - newTotal).toLocaleString()} remaining.`,
        );
      }
    } catch (error: any) {
      Alert.alert('Payment Failed', error?.response?.data?.message || 'Please try again');
    } finally {
      setPaying(false);
    }
  };

  const splitEvenly = () => {
    const participants = participantIds.filter((id) => id.trim()).length + 1; // +1 for initiator
    const perPerson = Math.ceil((totalAmount || 0) / participants);
    setMyContribution(perPerson.toString());
  };

  const remaining = Math.max(0, (totalAmount || 0) - totalContributed);
  const isUrgent = countdown <= 120; // last 2 minutes

  return (
    <View style={styles.container}>
      <StarlightBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Step 1: Setup participants */}
        {step === 'setup' && (
          <View style={styles.section}>
            <Text style={styles.stepTitle}>Add Participants</Text>
            <Text style={styles.stepSubtitle}>
              Enter participant user IDs. Each person pays their share within 8 minutes.
            </Text>

            {/* Cost summary */}
            <View style={styles.costCard}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Subtotal</Text>
                <Text style={styles.costValue}>₦{(basePrice || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Service Charge</Text>
                <Text style={styles.costValue}>₦{SERVICE_CHARGE.toLocaleString()}</Text>
              </View>
              <View style={styles.costDivider} />
              <View style={styles.costRow}>
                <Text style={styles.costTotalLabel}>Total</Text>
                <Text style={styles.costTotalValue}>₦{(totalAmount || 0).toLocaleString()}</Text>
              </View>
            </View>

            {/* You */}
            <View style={styles.participantCard}>
              <View style={styles.participantAvatar}>
                <Ionicons name="person" size={20} color="#f5dd4b" />
              </View>
              <Text style={styles.participantName}>You (Initiator)</Text>
              <Ionicons name="star" size={16} color="#f5dd4b" />
            </View>

            {/* Participants */}
            {participantIds.map((id, index) => (
              <View key={index} style={styles.participantInputRow}>
                <View style={styles.participantInputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.participantInput}
                    placeholder={`Participant ${index + 1} User ID`}
                    placeholderTextColor="#555"
                    value={id}
                    onChangeText={(val) => updateParticipant(index, val)}
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity onPress={() => removeParticipant(index)} style={styles.removeBtn}>
                  <Ionicons name="close-circle" size={22} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addParticipantBtn} onPress={addParticipant}>
              <Ionicons name="add-circle-outline" size={20} color="#f5dd4b" />
              <Text style={styles.addParticipantText}>Add Another Participant</Text>
            </TouchableOpacity>

            <View style={styles.warningCard}>
              <Ionicons name="time" size={16} color="#f5dd4b" />
              <Text style={styles.warningText}>
                After confirming, all participants have exactly 8 minutes to contribute their share.
                Unpaid bookings expire automatically.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.initiateButton, initiating && { opacity: 0.6 }]}
              onPress={handleInitiateGroupBooking}
              disabled={initiating}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#f5dd4b', '#d4a017']} style={styles.initiateGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {initiating ? <ActivityIndicator color="#111" /> : (
                  <Text style={styles.initiateText}>Start Group Booking</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2 & 3: Countdown + Payment */}
        {(step === 'countdown' || step === 'payment') && booking && (
          <View style={styles.section}>
            {/* Countdown timer */}
            <View style={[styles.countdownCard, isUrgent && styles.countdownCardUrgent]}>
              <Text style={styles.countdownLabel}>Time Remaining</Text>
              <Text style={[styles.countdownValue, isUrgent && { color: '#ff4444' }]}>
                {formatCountdown(countdown)}
              </Text>
              {/* Animated progress bar */}
              <View style={styles.progressBg}>
                <Animated.View style={[
                  styles.progressFill,
                  {
                    backgroundColor: isUrgent ? '#ff4444' : '#f5dd4b',
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]} />
              </View>
              {isUrgent && (
                <Text style={styles.urgentText}>⚠ Less than 2 minutes left!</Text>
              )}
            </View>

            {/* Payment progress */}
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Payment Progress</Text>
              <View style={styles.amountRow}>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Contributed</Text>
                  <Text style={[styles.amountValue, { color: '#00C851' }]}>
                    ₦{totalContributed.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.amountDivider} />
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Remaining</Text>
                  <Text style={[styles.amountValue, { color: '#ff9800' }]}>
                    ₦{remaining.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.amountDivider} />
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Total</Text>
                  <Text style={styles.amountValue}>₦{(totalAmount || 0).toLocaleString()}</Text>
                </View>
              </View>
              {/* Visual progress */}
              <View style={styles.payProgressBg}>
                <View style={[styles.payProgressFill, {
                  width: `${Math.min(100, (totalContributed / (totalAmount || 1)) * 100)}%`,
                }]} />
              </View>
            </View>

            {/* My contribution */}
            <View style={styles.contributionCard}>
              <Text style={styles.contributionTitle}>My Contribution</Text>
              <Text style={styles.contributionBalance}>
                Wallet Balance: ₦{walletBalance.toLocaleString()}
              </Text>

              <TouchableOpacity style={styles.splitBtn} onPress={splitEvenly}>
                <Ionicons name="calculator-outline" size={16} color="#f5dd4b" />
                <Text style={styles.splitBtnText}>
                  Split Evenly (÷{participantIds.filter((id) => id.trim()).length + 1})
                </Text>
              </TouchableOpacity>

              <View style={styles.amountInputRow}>
                <View style={styles.amountInputWrap}>
                  <Text style={styles.naira}>₦</Text>
                  <TextInput
                    style={styles.amountInputField}
                    placeholder="0"
                    placeholderTextColor="#555"
                    value={myContribution}
                    onChangeText={setMyContribution}
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.payBtn, paying && { opacity: 0.6 }]}
                  onPress={handleMyContribution}
                  disabled={paying}
                  activeOpacity={0.8}
                >
                  {paying ? <ActivityIndicator color="#111" size="small" /> : (
                    <Text style={styles.payBtnText}>Pay</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Booking reference */}
            <View style={styles.refCard}>
              <Text style={styles.refLabel}>Booking Reference</Text>
              <Text style={styles.refValue}>{booking.id?.slice(0, 16)}...</Text>
              <Text style={styles.refNote}>
                Share this with participants so they can contribute their portion
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 20 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  stepSubtitle: { color: '#888', fontSize: 14, marginBottom: 24, lineHeight: 20 },
  costCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 24,
  },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  costLabel: { color: '#888', fontSize: 14 },
  costValue: { color: '#fff', fontSize: 14 },
  costDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 10 },
  costTotalLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  costTotalValue: { color: '#f5dd4b', fontSize: 18, fontWeight: 'bold' },
  participantCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,221,75,0.08)', borderRadius: 10, padding: 14, marginBottom: 10,
  },
  participantAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(245,221,75,0.15)', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  participantName: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  participantInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  participantInputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  participantInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 14 },
  removeBtn: { marginLeft: 10 },
  addParticipantBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(245,221,75,0.3)',
    marginBottom: 20,
  },
  addParticipantText: { color: '#f5dd4b', fontSize: 14, marginLeft: 8 },
  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(245,221,75,0.07)', borderRadius: 10, padding: 14, marginBottom: 24,
  },
  warningText: { color: '#aaa', fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 18 },
  initiateButton: { borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  initiateGradient: { paddingVertical: 18, alignItems: 'center' },
  initiateText: { color: '#111', fontSize: 18, fontWeight: 'bold' },
  // Countdown
  countdownCard: {
    backgroundColor: 'rgba(245,221,75,0.08)', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(245,221,75,0.2)',
  },
  countdownCardUrgent: {
    borderColor: 'rgba(255,68,68,0.4)', backgroundColor: 'rgba(255,68,68,0.07)',
  },
  countdownLabel: { color: '#888', fontSize: 13, marginBottom: 8 },
  countdownValue: { color: '#f5dd4b', fontSize: 56, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  progressBg: {
    width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2, marginTop: 16, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  urgentText: { color: '#ff4444', fontSize: 12, marginTop: 10, fontWeight: '600' },
  progressCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 20,
  },
  progressTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  amountItem: { flex: 1, alignItems: 'center' },
  amountLabel: { color: '#888', fontSize: 11, marginBottom: 6 },
  amountValue: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  amountDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  payProgressBg: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden',
  },
  payProgressFill: { height: '100%', backgroundColor: '#00C851', borderRadius: 3 },
  contributionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 20,
  },
  contributionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  contributionBalance: { color: '#888', fontSize: 12, marginBottom: 14 },
  splitBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,221,75,0.1)', padding: 10,
    borderRadius: 8, marginBottom: 14, alignSelf: 'flex-start',
  },
  splitBtnText: { color: '#f5dd4b', fontSize: 13, marginLeft: 6 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  amountInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 14,
  },
  naira: { color: '#f5dd4b', fontSize: 22, fontWeight: 'bold', marginRight: 8 },
  amountInputField: { flex: 1, color: '#fff', fontSize: 22, paddingVertical: 14 },
  payBtn: {
    backgroundColor: '#f5dd4b', paddingHorizontal: 20, paddingVertical: 16,
    borderRadius: 10, minWidth: 80, alignItems: 'center',
  },
  payBtnText: { color: '#111', fontSize: 16, fontWeight: 'bold' },
  refCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginBottom: 24,
  },
  refLabel: { color: '#666', fontSize: 11, marginBottom: 4 },
  refValue: { color: '#888', fontSize: 13, fontFamily: 'monospace', marginBottom: 8 },
  refNote: { color: '#555', fontSize: 11, lineHeight: 16 },
});