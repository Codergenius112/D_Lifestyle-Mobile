import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StarlightBackground from '../../components/StarlightBackground';
import { useStore } from '../../store/useStore';
import { queuesAPI } from '../../services/api';
import type { QueueEntry } from '../../services/api';

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  WAITING:    { color: '#f5dd4b', label: 'In Queue',     icon: 'time' },
  CALLED:     { color: '#00bcd4', label: 'Your Turn!',   icon: 'megaphone' },
  CHECKED_IN: { color: '#00C851', label: 'Checked In',   icon: 'checkmark-circle' },
  CANCELLED:  { color: '#ff4444', label: 'Left Queue',   icon: 'close-circle' },
};

export default function QueueScreen({ route, navigation }: any) {
  const { venueId, venueName } = route.params || {};

  const joinQueueStore   = useStore((state) => state.joinQueue);
  const leaveQueueStore  = useStore((state) => state.leaveQueue);
  const updatePosition   = useStore((state) => state.updateQueuePosition);
  const currentQueueId   = useStore((state) => state.currentQueueId);
  const queuePosition    = useStore((state) => state.queuePosition);
  const inQueue          = useStore((state) => state.inQueue);

  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  // Pulse animation for "your turn" state
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    if (queueEntry?.status === 'CALLED') pulse.start();
    else pulse.stop();
    return () => pulse.stop();
  }, [queueEntry?.status, pulseAnim]);

  // Poll queue position every 15 seconds while in queue
  useEffect(() => {
    if (!inQueue || !currentQueueId) return;
    const poll = async () => {
      try {
        // GET /queues/position/:queueId
        const entry = await queuesAPI.getQueuePosition(currentQueueId);
        setQueueEntry(entry);
        updatePosition(entry.position);
      } catch (err) {
        console.error('Queue poll error:', err);
      }
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [inQueue, currentQueueId, updatePosition]);

  const handleJoinQueue = async () => {
    if (!venueId) {
      Alert.alert('Error', 'No venue selected');
      return;
    }
    try {
      setJoining(true);
      // POST /queues → { venueId } — userId derived from JWT
      const entry = await queuesAPI.joinQueue(venueId);
      setQueueEntry(entry);
      joinQueueStore(entry.id, entry.position);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to join queue. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveQueue = () => {
    Alert.alert(
      'Leave Queue',
      'Are you sure you want to leave the queue? You will lose your position.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!currentQueueId) return;
            try {
              setLeaving(true);
              // POST /queues/:queueId/cancel
              await queuesAPI.cancelQueue(currentQueueId);
              leaveQueueStore();
              setQueueEntry(null);
            } catch (error: any) {
              Alert.alert('Error', 'Failed to leave queue');
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    );
  };

  const handleCheckIn = async () => {
    if (!currentQueueId) return;
    try {
      setCheckingIn(true);
      // POST /queues/:queueId/checkin
      const updated = await queuesAPI.checkIn(currentQueueId);
      setQueueEntry(updated);
      if (updated.status === 'CHECKED_IN') {
        leaveQueueStore();
        Alert.alert('Welcome!', "You've been checked in. Enjoy your night! 🎉", [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const statusCfg = queueEntry ? (STATUS_CONFIG[queueEntry.status] || STATUS_CONFIG['WAITING']) : null;

  return (
    <View style={styles.container}>
      <StarlightBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Virtual Queue</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Venue name */}
        {venueName && (
          <Text style={styles.venueName}>{venueName}</Text>
        )}

        {/* Not in queue */}
        {!inQueue && !queueEntry && (
          <View style={styles.centered}>
            <View style={styles.queueIconContainer}>
              <Ionicons name="people" size={64} color="#f5dd4b" />
            </View>
            <Text style={styles.joinTitle}>Join the Queue</Text>
            <Text style={styles.joinSubtitle}>
              Skip the physical line. Get notified when it's your turn.
            </Text>

            <View style={styles.benefitsList}>
              {[
                { icon: 'phone-portrait', text: 'Wait anywhere with your phone' },
                { icon: 'notifications', text: 'Get notified when called' },
                { icon: 'time', text: 'See estimated wait time' },
              ].map((item) => (
                <View key={item.text} style={styles.benefitItem}>
                  <Ionicons name={item.icon as any} size={18} color="#f5dd4b" />
                  <Text style={styles.benefitText}>{item.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.joinButton} onPress={handleJoinQueue}
              disabled={joining} activeOpacity={0.8}>
              <LinearGradient colors={['#f5dd4b', '#d4a017']} style={styles.joinGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {joining ? <ActivityIndicator color="#111" /> : (
                  <Text style={styles.joinButtonText}>Join Queue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* In queue */}
        {(inQueue || queueEntry) && queueEntry && statusCfg && (
          <View style={styles.inQueueContainer}>
            {/* Status badge */}
            <View style={[styles.statusCard, { borderColor: statusCfg.color + '40' }]}>
              <Animated.View style={[styles.statusIconWrap,
                { backgroundColor: statusCfg.color + '20' },
                queueEntry.status === 'CALLED' && { transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name={statusCfg.icon} size={40} color={statusCfg.color} />
              </Animated.View>
              <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>

            {/* Position display */}
            {(queueEntry.status === 'WAITING' || queueEntry.status === 'CALLED') && (
              <View style={styles.positionCard}>
                <Text style={styles.positionLabel}>Your Position</Text>
                <Text style={styles.positionNumber}>#{queueEntry.position}</Text>
                <Text style={styles.positionSub}>
                  {queueEntry.position === 1
                    ? "You're next! Get ready."
                    : `${queueEntry.position - 1} people ahead of you`}
                </Text>
              </View>
            )}

            {/* Queue ID */}
            <View style={styles.queueIdCard}>
              <Text style={styles.queueIdLabel}>Queue Reference</Text>
              <Text style={styles.queueIdValue}>{queueEntry.id?.slice(0, 16)}...</Text>
            </View>

            {/* Poll notice */}
            <View style={styles.pollNotice}>
              <Ionicons name="refresh" size={14} color="#888" />
              <Text style={styles.pollText}>Position refreshes every 15 seconds</Text>
            </View>

            {/* Actions */}
            {queueEntry.status === 'CALLED' && (
              <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}
                disabled={checkingIn} activeOpacity={0.8}>
                <LinearGradient colors={['#00C851', '#009c3e']} style={styles.checkInGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {checkingIn ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Ionicons name="scan" size={22} color="#fff" />
                      <Text style={styles.checkInText}>Check In Now</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {['WAITING', 'CALLED'].includes(queueEntry.status) && (
              <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveQueue}
                disabled={leaving} activeOpacity={0.8}>
                {leaving ? <ActivityIndicator color="#ff4444" /> : (
                  <Text style={styles.leaveButtonText}>Leave Queue</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
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
  content: { flex: 1, paddingHorizontal: 24 },
  venueName: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  queueIconContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(245,221,75,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  joinTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  joinSubtitle: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 20 },
  benefitsList: { width: '100%', marginBottom: 40 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  benefitText: { color: '#ccc', fontSize: 15, marginLeft: 14 },
  joinButton: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  joinGradient: { paddingVertical: 18, alignItems: 'center' },
  joinButtonText: { color: '#111', fontSize: 18, fontWeight: 'bold' },
  // In queue
  inQueueContainer: { flex: 1, alignItems: 'center', paddingTop: 20 },
  statusCard: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20, padding: 28, width: '100%', marginBottom: 20,
    borderWidth: 1,
  },
  statusIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  statusLabel: { fontSize: 22, fontWeight: 'bold' },
  positionCard: {
    backgroundColor: 'rgba(245,221,75,0.08)', borderRadius: 16,
    padding: 20, width: '100%', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(245,221,75,0.2)',
  },
  positionLabel: { color: '#888', fontSize: 14, marginBottom: 6 },
  positionNumber: { color: '#f5dd4b', fontSize: 64, fontWeight: 'bold', lineHeight: 72 },
  positionSub: { color: '#aaa', fontSize: 14, marginTop: 6 },
  queueIdCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14,
    width: '100%', marginBottom: 12,
  },
  queueIdLabel: { color: '#666', fontSize: 11, marginBottom: 4 },
  queueIdValue: { color: '#888', fontSize: 12, fontFamily: 'monospace' },
  pollNotice: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 28,
  },
  pollText: { color: '#666', fontSize: 11, marginLeft: 6 },
  checkInButton: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  checkInGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, gap: 10,
  },
  checkInText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  leaveButton: {
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 12, borderWidth: 1, borderColor: '#ff4444',
  },
  leaveButtonText: { color: '#ff4444', fontSize: 16, fontWeight: '600' },
});