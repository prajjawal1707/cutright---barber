import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, setHours, setMinutes, addMinutes } from 'date-fns';
import type { TimeSlot } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

export function calculateETA(distanceKm: number): string {
  const mins = Math.ceil(distanceKm * 3);
  if (mins < 60) return `~${mins} min`;
  return `~${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function generateTimeSlots(date: Date, durationMinutes: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();
  for (let hour = 9; hour < 20; hour++) {
    for (let min = 0; min < 60; min += durationMinutes) {
      const slotTime = setMinutes(setHours(new Date(date), hour), min);
      slots.push({
        time: format(slotTime, 'HH:mm'),
        label: format(slotTime, 'h:mm a'),
        available: slotTime > now,
      });
    }
  }
  return slots;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    accepted: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    in_progress: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    completed: 'text-green-400 bg-green-400/10 border-green-400/20',
    cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
  };
  return map[status] ?? 'text-ink-300 bg-ink-700/50';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Finding Barber',
    accepted: 'Barber Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
  };
  return map[status] ?? status;
}

export function avatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C9A84C&color=0A0A0A&bold=true&size=128`;
}
