export type UserRole = 'user' | 'barber';

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Barber {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  avatar_url?: string;
  lat: number;
  lng: number;
  address: string;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  experience_years: number;
  bio?: string;
  created_at: string;
  distance?: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  icon: string;
  category: 'hair' | 'beard' | 'combo' | 'other';
  is_active: boolean;
}

export type BookingStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Booking {
  id: string;
  user_id: string;
  barber_id?: string;
  service_id: string;
  status: BookingStatus;
  scheduled_at: string;
  address: string;
  lat: number;
  lng: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_id?: string;
  razorpay_order_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  service?: Service;
  barber?: Barber;
  user?: UserProfile;
}

export interface TimeSlot {
  time: string;
  label: string;
  available: boolean;
}

export interface Rating {
  id: string;
  booking_id: string;
  user_id: string;
  barber_id: string;
  rating: number;
  review?: string;
  created_at: string;
}
