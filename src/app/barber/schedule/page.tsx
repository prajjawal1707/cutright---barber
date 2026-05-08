'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, Clock, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import type { Booking } from '@/types';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function BarberSchedulePage() {
  const router = useRouter();
  const supabase = createClient();
  const [barberId, setBarberId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => { init(); }, []);
  useEffect(() => { if (barberId) loadBookings(barberId, selectedDate); }, [selectedDate, barberId]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    const { data: b } = await supabase.from('barbers').select('id').eq('user_id', user.id).single();
    if (!b) { router.replace('/'); return; }
    setBarberId(b.id);
    await loadBookings(b.id, selectedDate);
    setLoading(false);
  }

  async function loadBookings(bid: string, date: Date) {
    const { data } = await supabase
      .from('bookings')
      .select('*,service:services(*),user:users(*)')
      .eq('barber_id', bid)
      .gte('scheduled_at', startOfDay(date).toISOString())
      .lte('scheduled_at', endOfDay(date).toISOString())
      .order('scheduled_at');
    setBookings(data || []);
  }

  async function markComplete(bookingId: string) {
    setCompleting(bookingId);
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
    if (barberId) await loadBookings(barberId, selectedDate);
    setCompleting(null);
  }

  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 1));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-gold animate-spin" />
    </div>
  );

  return (
    <div>
      <header className="px-5 pt-14 pb-4">
        <h1 className="font-display text-2xl font-bold text-cream">My Schedule</h1>
        <p className="text-ink-400 text-sm mt-1">{bookings.length} appointments</p>

        {/* Date strip */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1">
          {dates.map((d, i) => {
            const sel = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isToday = i === 1;
            return (
              <button key={i} onClick={() => setSelectedDate(d)}
                className={cn('flex-shrink-0 w-14 py-3 rounded-xl flex flex-col items-center gap-1 transition-all border',
                  sel ? 'bg-gold border-gold text-ink-900' : 'border-gold/10 bg-ink-800/50 text-ink-300 hover:border-gold/20')}>
                <span className="text-[10px] font-semibold uppercase">{isToday ? 'Today' : format(d, 'EEE')}</span>
                <span className={cn('text-lg font-bold', sel ? 'text-ink-900' : 'text-cream')}>{format(d, 'd')}</span>
                <span className={cn('text-[9px]', sel ? 'text-ink-800' : 'text-ink-500')}>{format(d, 'MMM')}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="px-5 flex flex-col gap-3 pb-4">
        {bookings.length === 0 ? (
          <div className="card text-center py-12">
            <CalendarDays className="w-12 h-12 text-ink-700 mx-auto mb-3" />
            <p className="text-ink-400 text-sm">No appointments on this day</p>
          </div>
        ) : bookings.map(b => (
          <div key={b.id} className="card">
            <div className="flex gap-3">
              {/* Time column */}
              <div className="text-center flex-shrink-0 w-14 pt-0.5">
                <p className="text-gold font-bold text-sm leading-none">
                  {format(new Date(b.scheduled_at), 'h:mm')}
                </p>
                <p className="text-ink-500 text-[10px] mt-0.5">
                  {format(new Date(b.scheduled_at), 'a')}
                </p>
              </div>
              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-cream font-semibold text-sm">
                      {(b as any).user?.name || 'Customer'}
                    </p>
                    <p className="text-ink-400 text-xs mt-0.5">
                      {b.service?.icon} {b.service?.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gold font-bold text-sm">{formatCurrency(b.total_amount)}</p>
                    <span className={`badge text-[10px] mt-1 ${getStatusColor(b.status)}`}>
                      {getStatusLabel(b.status)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.service?.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.address || 'On location'}</span>
                </div>
                {b.status === 'accepted' && (
                  <button
                    onClick={() => markComplete(b.id)}
                    disabled={completing === b.id}
                    className="mt-3 flex items-center gap-2 bg-green-400/8 border border-green-400/20 text-green-400 rounded-xl px-3 py-2 text-xs font-medium hover:bg-green-400/15 transition-all disabled:opacity-50"
                  >
                    {completing === b.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCircle className="w-3.5 h-3.5" />}
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
