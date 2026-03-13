/**
 * useStore.ts — Zustand global store
 *
 * Auth shape mirrors AuthResponseDto from backend:
 *   { accessToken, refreshToken, user: { id, email, firstName, lastName, role } }
 *
 * Key corrections from old store:
 *   - authToken → accessToken (matches backend field name)
 *   - refreshToken stored for token refresh
 *   - user.name removed; use firstName + lastName
 *   - walletBalance fetched from server, not hardcoded
 *   - booking statuses include all backend BookingStatus enum values
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser, BackendBooking } from '../services/api';

// ─── Booking status enum (mirrors backend) ────────────────────────────────────
export type BookingStatus =
  | 'INITIATED'
  | 'PENDING_PAYMENT'
  | 'PENDING_GROUP_PAYMENT'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'REFUNDED';

// ─── State interface ──────────────────────────────────────────────────────────
interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Wallet
  walletBalance: number;

  // Bookings cache
  bookings: BackendBooking[];

  // Favorites (event IDs)
  favoriteEvents: string[];

  // Queue
  currentQueueId: string | null;
  queuePosition: number | null;
  inQueue: boolean;

  // UI
  isLoading: boolean;
  error: string | null;

  // ── Actions ──
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;

  setWalletBalance: (balance: number) => void;

  setBookings: (bookings: BackendBooking[]) => void;
  addBooking: (booking: BackendBooking) => void;
  updateBooking: (bookingId: string, updates: Partial<BackendBooking>) => void;

  addFavoriteEvent: (eventId: string) => void;
  removeFavoriteEvent: (eventId: string) => void;

  joinQueue: (queueId: string, position: number) => void;
  leaveQueue: () => void;
  updateQueuePosition: (position: number) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      walletBalance: 0,
      bookings: [],
      favoriteEvents: [],
      currentQueueId: null,
      queuePosition: null,
      inQueue: false,
      isLoading: false,
      error: null,

      // Auth actions
      login: (user, accessToken, refreshToken) =>
        set({ isAuthenticated: true, user, accessToken, refreshToken }),

      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          bookings: [],
          walletBalance: 0,
          currentQueueId: null,
          queuePosition: null,
          inQueue: false,
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // Wallet
      setWalletBalance: (balance) => set({ walletBalance: balance }),

      // Bookings
      setBookings: (bookings) => set({ bookings }),

      addBooking: (booking) =>
        set((state) => ({ bookings: [booking, ...state.bookings] })),

      updateBooking: (bookingId, updates) =>
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, ...updates } : b,
          ),
        })),

      // Favorites
      addFavoriteEvent: (eventId) =>
        set((state) => ({
          favoriteEvents: [...state.favoriteEvents, eventId],
        })),

      removeFavoriteEvent: (eventId) =>
        set((state) => ({
          favoriteEvents: state.favoriteEvents.filter((id) => id !== eventId),
        })),

      // Queue
      joinQueue: (queueId, position) =>
        set({ inQueue: true, currentQueueId: queueId, queuePosition: position }),

      leaveQueue: () =>
        set({ inQueue: false, currentQueueId: null, queuePosition: null }),

      updateQueuePosition: (position) => set({ queuePosition: position }),

      // UI
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'dlifestyle-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: Boolean(state.isAuthenticated),
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        favoriteEvents: state.favoriteEvents,
        walletBalance: state.walletBalance,
      }),
      version: 1,
      migrate: (persisted: any) => ({
        isAuthenticated: Boolean(persisted?.isAuthenticated),
        user: persisted?.user || null,
        accessToken: persisted?.accessToken || persisted?.authToken || null,
        refreshToken: persisted?.refreshToken || null,
        favoriteEvents: persisted?.favoriteEvents || [],
        walletBalance: Number(persisted?.walletBalance) || 0,
      }),
    },
  ),
);