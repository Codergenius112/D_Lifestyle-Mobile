/**
 * api.ts — D'Lifestyle Frontend API Service
 *
 * Aligned 1-to-1 with the NestJS backend:
 *   POST /auth/register             → authAPI.register
 *   POST /auth/login                → authAPI.login
 *   POST /auth/refresh              → authAPI.refreshToken
 *   GET  /events                    → eventsAPI.getEvents
 *   GET  /events/:id                → eventsAPI.getEventById
 *   POST /bookings                  → bookingsAPI.createBooking
 *   GET  /bookings                  → bookingsAPI.getMyBookings
 *   GET  /bookings/:id              → bookingsAPI.getBookingById
 *   PATCH /bookings/:id/status      → bookingsAPI.updateStatus
 *   POST /bookings/:id/checkin      → bookingsAPI.checkIn
 *   POST /tickets                   → ticketsAPI.createTicket
 *   GET  /tickets                   → ticketsAPI.getMyTickets
 *   GET  /tickets/:id               → ticketsAPI.getTicket
 *   PATCH /tickets/:id/cancel       → ticketsAPI.cancelTicket
 *   POST /tables                    → tablesAPI.bookTable
 *   GET  /tables                    → tablesAPI.getMyBookings
 *   GET  /tables/:id                → tablesAPI.getBooking
 *   GET  /tables/venue/:venueId     → tableListingsAPI.getVenueTables
 *   POST /apartments                → apartmentsAPI.bookApartment
 *   GET  /apartments                → apartmentsAPI.getMyBookings
 *   GET  /apartments/:id            → apartmentsAPI.getBooking
 *   GET  /apartments/listings       → apartmentsAPI.getListings
 *   GET  /apartments/listings/:id   → apartmentsAPI.getListing
 *   POST /cars                      → carsAPI.rentCar
 *   GET  /cars                      → carsAPI.getMyRentals
 *   GET  /cars/:id                  → carsAPI.getRental
 *   GET  /cars/listings             → carsAPI.getListings
 *   GET  /cars/listings/:id         → carsAPI.getListing
 *   POST /payments                  → paymentsAPI.processPayment
 *   POST /payments/refund           → paymentsAPI.refundPayment
 *   POST /queues                    → queuesAPI.joinQueue
 *   GET  /queues/position/:id       → queuesAPI.getQueuePosition
 *   POST /queues/:id/checkin        → queuesAPI.checkIn
 *   POST /queues/:id/cancel         → queuesAPI.cancel
 *
 * Business rules enforced on the frontend:
 *   - Service charge ₦400 (non-refundable) is added at checkout
 *   - Platform commission 3% is VENUE-PAID and NOT shown to user
 *   - Total shown to user = basePrice + ₦400 only
 *   - Payment methods: 'wallet' | 'paystack' (NO Stripe)
 *   - Auth response shape: { accessToken, refreshToken, user: { id, email, firstName, lastName, role } }
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { useStore } from '../store/useStore';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
export const SERVICE_CHARGE = 400; // ₦400 fixed, non-refundable, backend-enforced

// ─── Axios Client ─────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
apiClient.interceptors.request.use(
  (config) => {
    const token = useStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Handle 401 — auto-logout
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      useStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface BackendBooking {
  id: string;
  bookingType: 'ticket' | 'table' | 'apartment' | 'car';
  status: string;
  paymentStatus: string;
  basePrice: number;
  serviceCharge: number;       // always 400
  platformCommission: number;  // 3% venue-paid, display only for admin
  totalAmount: number;         // basePrice + serviceCharge
  guestCount: number;
  resourceId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface BackendEvent {
  id: string;
  name: string;
  description: string;
  venueId: string;
  startDate: string;
  endDate: string;
  capacity: number;
  djs?: string[];
  genre?: string;
  dresscode?: string;
  status: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  bookingId: string;
  amount: number;
  status: string;
  paymentMethod: 'wallet' | 'paystack';
  completedAt?: string;
  createdAt: string;
}

export interface QueueEntry {
  id: string;
  venueId: string;
  position: number;
  status: string;
  createdAt: string;
}

export interface ApartmentListing {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pricePerNight: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  images: string[];
  isActive: boolean;
  managedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarListing {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  transmission: string;  // 'automatic' | 'manual'
  category: string;      // 'sedan' | 'suv' | 'luxury' | 'van'
  seats: number;
  pricePerDay: number;
  description: string;
  features: string[];
  images: string[];
  city: string;
  state: string;
  withDriver: boolean;
  isActive: boolean;
  managedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TableListing {
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

// ─── Auth API ─────────────────────────────────────────────────────────────────
// Routes: POST /auth/register, POST /auth/login, POST /auth/refresh

export const authAPI = {
  /** POST /auth/register */
  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  /** POST /auth/login */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  /** POST /auth/refresh */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};

// ─── Events API ───────────────────────────────────────────────────────────────
// Routes: GET /events, GET /events/:id

export const eventsAPI = {
  /** GET /events */
  getEvents: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ events: BackendEvent[]; total: number }> => {
    const response = await apiClient.get('/events', { params });
    return response.data;
  },

  /** GET /events/:id */
  getEventById: async (eventId: string): Promise<BackendEvent> => {
    const response = await apiClient.get(`/events/${eventId}`);
    return response.data;
  },
};

// ─── Bookings API ─────────────────────────────────────────────────────────────
// Routes: POST /bookings, GET /bookings, GET /bookings/:id,
//         PATCH /bookings/:id/status, POST /bookings/:id/checkin

export const bookingsAPI = {
  /**
   * POST /bookings
   * Creates a booking. userId is derived from JWT on the backend.
   * totalAmount = basePrice + 400 (service charge, backend calculates it)
   */
  createBooking: async (data: {
    bookingType: 'ticket' | 'table' | 'apartment' | 'car';
    resourceId: string;
    basePrice: number;
    guestCount: number;
    metadata?: Record<string, any>;
  }): Promise<BackendBooking> => {
    const response = await apiClient.post('/bookings', data);
    return response.data;
  },

  /**
   * POST /bookings (group variant)
   * Initiates a group booking → status = PENDING_GROUP_PAYMENT
   * 8-minute countdown enforced by backend GroupBookingCountdownService
   */
  createGroupBooking: async (data: {
    bookingType: 'ticket' | 'table' | 'apartment' | 'car';
    resourceId: string;
    basePrice: number;
    guestCount: number;
    participantIds: string[];
    metadata?: Record<string, any>;
  }): Promise<BackendBooking> => {
    const response = await apiClient.post('/bookings', {
      ...data,
      isGroup: true,
    });
    return response.data;
  },

  /** GET /bookings — returns bookings for the authenticated user (JWT-derived) */
  getMyBookings: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ bookings: BackendBooking[]; total: number }> => {
    const response = await apiClient.get('/bookings', { params });
    return response.data;
  },

  /** GET /bookings/:id */
  getBookingById: async (bookingId: string): Promise<BackendBooking> => {
    const response = await apiClient.get(`/bookings/${bookingId}`);
    return response.data;
  },

  /** PATCH /bookings/:id/status */
  updateStatus: async (
    bookingId: string,
    status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED',
    reason?: string,
  ): Promise<BackendBooking> => {
    const response = await apiClient.patch(`/bookings/${bookingId}/status`, {
      status,
      reason,
    });
    return response.data;
  },

  /** POST /bookings/:id/checkin */
  checkIn: async (bookingId: string): Promise<BackendBooking> => {
    const response = await apiClient.post(`/bookings/${bookingId}/checkin`);
    return response.data;
  },
};

// ─── Tickets API ──────────────────────────────────────────────────────────────
// Routes: POST /tickets, GET /tickets, GET /tickets/:id, PATCH /tickets/:id/cancel

export const ticketsAPI = {
  /**
   * POST /tickets
   * Creates a ticket booking. userId derived from JWT.
   * totalAmount = totalPrice + 400 (service charge)
   */
  createTicket: async (data: {
    eventId: string;
    quantity: number;
    totalPrice: number; // basePrice * quantity, before service charge
  }): Promise<BackendBooking> => {
    const response = await apiClient.post('/tickets', data);
    return response.data;
  },

  /** GET /tickets — returns tickets for authenticated user */
  getMyTickets: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ tickets: BackendBooking[]; total: number }> => {
    const response = await apiClient.get('/tickets', { params });
    return response.data;
  },

  /** GET /tickets/:id */
  getTicket: async (ticketId: string): Promise<BackendBooking> => {
    const response = await apiClient.get(`/tickets/${ticketId}`);
    return response.data;
  },

  /** PATCH /tickets/:id/cancel */
  cancelTicket: async (ticketId: string): Promise<BackendBooking> => {
    const response = await apiClient.patch(`/tickets/${ticketId}/cancel`);
    return response.data;
  },
};

// ─── Tables API ───────────────────────────────────────────────────────────────
// Routes: POST /tables, GET /tables, GET /tables/:id

export const tablesAPI = {
  /**
   * POST /tables
   * Creates a table booking. userId derived from JWT.
   * totalAmount = price + 400 (service charge)
   */
  bookTable: async (data: {
    venueId: string;
    tableId: string;
    guestCount: number;
    bookingDate: string;
    price: number;
  }): Promise<BackendBooking> => {
    const response = await apiClient.post('/tables', data);
    return response.data;
  },

  /** GET /tables — returns table bookings for authenticated user */
  getMyBookings: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ bookings: BackendBooking[]; total: number }> => {
    const response = await apiClient.get('/tables', { params });
    return response.data;
  },

  /** GET /tables/:id */
  getBooking: async (bookingId: string): Promise<BackendBooking> => {
    const response = await apiClient.get(`/tables/${bookingId}`);
    return response.data;
  },
};

// ─── Table Listings API ───────────────────────────────────────────────────────
// Route: GET /tables/venue/:venueId

export const tableListingsAPI = {
  /**
   * GET /tables/venue/:venueId
   * Returns all active table listings for a venue with live availability.
   * available=false means a CONFIRMED booking already exists for that table.
   */
  getVenueTables: async (
    venueId: string,
  ): Promise<{ tables: TableListing[]; total: number; venueId: string }> => {
    const response = await apiClient.get(`/tables/venue/${venueId}`);
    return response.data;
  },
};

// ─── Apartments API ───────────────────────────────────────────────────────────
// Routes: POST /apartments, GET /apartments, GET /apartments/:id,
//         GET /apartments/listings, GET /apartments/listings/:id

export const apartmentsAPI = {
  // ── Listings (browse available apartments) ────────────────────────────────

  /**
   * GET /apartments/listings
   * Returns available apartment listings (not bookings).
   * Query: limit, offset, city, minPrice, maxPrice, bedrooms
   */
  getListings: async (params?: {
    limit?: number;
    offset?: number;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
  }): Promise<{ listings: ApartmentListing[]; total: number }> => {
    const response = await apiClient.get('/apartments/listings', { params });
    return response.data;
  },

  /** GET /apartments/listings/:id */
  getListing: async (listingId: string): Promise<ApartmentListing> => {
    const response = await apiClient.get(`/apartments/listings/${listingId}`);
    return response.data;
  },

  // ── Bookings ──────────────────────────────────────────────────────────────

  /**
   * POST /apartments
   * Creates an apartment booking. userId derived from JWT.
   * totalAmount = price + 400 (service charge)
   * cautionFee = 10% of price (in metadata, backend-calculated)
   */
  bookApartment: async (data: {
    apartmentId: string;
    checkInDate: string;
    checkOutDate: string;
    price: number;
  }): Promise<BackendBooking> => {
    const response = await apiClient.post('/apartments', data);
    return response.data;
  },

  /** GET /apartments — returns apartment bookings for authenticated user */
  getMyBookings: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ bookings: BackendBooking[]; total: number }> => {
    const response = await apiClient.get('/apartments', { params });
    return response.data;
  },

  /** GET /apartments/:id */
  getBooking: async (bookingId: string): Promise<BackendBooking> => {
    const response = await apiClient.get(`/apartments/${bookingId}`);
    return response.data;
  },
};

// ─── Cars API ─────────────────────────────────────────────────────────────────
// Routes: POST /cars, GET /cars, GET /cars/:id,
//         GET /cars/listings, GET /cars/listings/:id

export const carsAPI = {
  // ── Listings (browse available cars) ──────────────────────────────────────

  /**
   * GET /cars/listings
   * Returns available car listings (not rentals).
   * Query: limit, offset, minPrice, maxPrice, category, transmission
   */
  getListings: async (params?: {
    limit?: number;
    offset?: number;
    minPrice?: number;
    maxPrice?: number;
    category?: string;
    transmission?: string;
  }): Promise<{ listings: CarListing[]; total: number }> => {
    const response = await apiClient.get('/cars/listings', { params });
    return response.data;
  },

  /** GET /cars/listings/:id */
  getListing: async (listingId: string): Promise<CarListing> => {
    const response = await apiClient.get(`/cars/listings/${listingId}`);
    return response.data;
  },

  // ── Rentals ───────────────────────────────────────────────────────────────

  /**
   * POST /cars
   * Creates a car rental booking. userId derived from JWT.
   * totalAmount = price + 400 (service charge)
   * cautionFee = 20% of price (in metadata, backend-calculated)
   */
  rentCar: async (data: {
    carId: string;
    pickupDate: string;
    returnDate: string;
    price: number;
    driverLicense: string;
  }): Promise<BackendBooking> => {
    const response = await apiClient.post('/cars', data);
    return response.data;
  },

  /** GET /cars — returns car rentals for authenticated user */
  getMyRentals: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ rentals: BackendBooking[]; total: number }> => {
    const response = await apiClient.get('/cars', { params });
    return response.data;
  },

  /** GET /cars/:id */
  getRental: async (rentalId: string): Promise<BackendBooking> => {
    const response = await apiClient.get(`/cars/${rentalId}`);
    return response.data;
  },
};

// ─── Payments API ─────────────────────────────────────────────────────────────
// Routes: POST /payments, POST /payments/refund
// Payment methods: 'wallet' | 'paystack' ONLY (no Stripe)
// When amount >= booking.totalAmount → backend sets paymentStatus=FULLY_PAID & status=CONFIRMED

export const paymentsAPI = {
  /**
   * POST /payments
   * Processes a payment for a booking.
   * If wallet: backend debits wallet and updates booking.
   * If paystack: paystackReference must be provided after Paystack SDK confirms payment.
   * When totalAmount is reached → booking auto-confirms.
   */
  processPayment: async (data: {
    bookingId: string;
    amount: number;
    method: 'wallet' | 'paystack';
    paystackReference?: string; // required when method='paystack'
  }): Promise<PaymentTransaction> => {
    const response = await apiClient.post('/payments', data);
    return response.data;
  },

  /** POST /payments/refund — refunds a payment back to wallet */
  refundPayment: async (paymentId: string): Promise<PaymentTransaction> => {
    const response = await apiClient.post('/payments/refund', { paymentId });
    return response.data;
  },
};

// ─── Queues API ───────────────────────────────────────────────────────────────
// Routes: POST /queues, GET /queues/position/:id,
//         POST /queues/:id/checkin, POST /queues/:id/cancel

export const queuesAPI = {
  /** POST /queues — join queue for a venue. userId derived from JWT. */
  joinQueue: async (venueId: string): Promise<QueueEntry> => {
    const response = await apiClient.post('/queues', { venueId });
    return response.data;
  },

  /** GET /queues/position/:queueId — get current queue position */
  getQueuePosition: async (queueId: string): Promise<QueueEntry> => {
    const response = await apiClient.get(`/queues/position/${queueId}`);
    return response.data;
  },

  /** POST /queues/:queueId/checkin — check in from queue */
  checkIn: async (queueId: string): Promise<QueueEntry> => {
    const response = await apiClient.post(`/queues/${queueId}/checkin`);
    return response.data;
  },

  /** POST /queues/:queueId/cancel — leave queue */
  cancelQueue: async (queueId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/queues/${queueId}/cancel`);
    return response.data;
  },
};

// ─── Pricing Helpers ──────────────────────────────────────────────────────────

/**
 * Calculate what the user sees at checkout.
 * Per business rules:
 *   - Service charge = ₦400 (fixed, non-refundable, client-displayed)
 *   - Platform commission = 3% of basePrice (venue-paid, NOT shown to user)
 *   - Total shown = basePrice + ₦400
 */
export const calculateCheckoutTotal = (basePrice: number) => ({
  basePrice,
  serviceCharge: SERVICE_CHARGE,
  total: basePrice + SERVICE_CHARGE,
  // For reference only — do NOT display to user
  platformCommission: basePrice * 0.03,
  venueNet: basePrice - basePrice * 0.03,
});

export default apiClient;