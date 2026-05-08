'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react';
import type { Booking } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

type Period = 'week' | 'month' | 'all';

export default function BarberEarningsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    const { data: b } = await supabase.from('barbers').select('id').eq('user_id', user.id).single();
    if (!b) { router.replace('/'); return; }
    const { data } = await supabase
      .from('bookings').select('*,service:services(*)')
      .eq('barber_id', b.id).eq('status', 'completed')
      .order('created_at', { ascending: false });
    setBookings(data || []);
    setLoading(false);
  }

  function inPeriod(bk: Booking[], p: Period) {
    const now = new Date();
    if (p === 'week') return bk.filter(b => { const d = new Date(b.created_at); return d >= startOfWeek(now) && d <= endOfWeek(now); });
    if (p === 'month') return bk.filter(b => { const d = new Date(b.created_at); return d >= startOfMonth(now) && d <= endOfMonth(now); });
    return bk;
  }

  function inPrevPeriod(bk: Booking[], p: Period) {
    const now = new Date();
    if (p === 'week') { const s = startOfWeek(new Date(now.getTime() - 7*86400000)); return bk.filter(b => { const d = new Date(b.created_at); return d >= s && d <= endOfWeek(s); }); }
    if (p === 'month') { const pm = subMonths(now, 1); return bk.filter(b => { const d = new Date(b.created_at); return d >= startOfMonth(pm) && d <= endOfMonth(pm); }); }
    return [];
  }

  const filtered = inPeriod(bookings, period);
  const prevFiltered = inPrevPeriod(bookings, period);

  const totalEarned = filtered.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.total_amount, 0);
  const prevEarned = prevFiltered.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.total_amount, 0);
  const pending = filtered.filter(b => b.payment_status !== 'paid').reduce((s, b) => s + b.total_amount, 0);
  const growth = prevEarned > 0 ? ((totalEarned - prevEarned) / prevEarned) * 100 : 0;
  const avgPerJob = filtered.length > 0 ? totalEarned / filtered.length : 0;

  const topService = filtered.length > 0
    ? Object.entries(filtered.reduce((acc, b) => { const n = b.service?.name || 'Unknown'; acc[n] = (acc[n] || 0) + 1; return acc; }, {} as Record<string, number>))
        .sort(([, a], [, b]) => b - a)[0]?.[0]
    : '—';

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-gold animate-spin" /></div>;

  return (
    <div>
      <header className="px-5 pt-14 pb-4">
        <h1 className="font-display text-2xl font-bold text-cream">Earnings</h1>
        <div className="flex gap-1 mt-4 glass rounded-xl p-1">
          {(['week', 'month', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                period === p ? 'bg-gold text-ink-900' : 'text-ink-400')}>
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 flex flex-col gap-4 pb-6">
        {/* Hero card */}
        <div className="card text-center py-7">
          <p className="text-ink-400 text-sm mb-2">Total Earned</p>
          <p className="font-display text-5xl font-black text-gradient mb-3">{formatCurrency(totalEarned)}</p>
          {period !== 'all' && (
            <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
              growth >= 0 ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400')}>
              {growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(growth).toFixed(1)}% vs last {period}
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Jobs Done', value: String(filtered.length), color: 'text-cream' },
            { label: 'Pending Payout', value: formatCurrency(pending), color: 'text-amber-400' },
            { label: 'Avg per Job', value: formatCurrency(avgPerJob), color: 'text-cream' },
            { label: 'Best Service', value: topService, color: 'text-cream' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card">
              <p className="text-ink-500 text-xs mb-1.5">{label}</p>
              <p className={cn('font-bold text-xl', color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div>
          <h2 className="font-semibold text-cream text-sm mb-3">Transactions</h2>
          {filtered.length === 0 ? (
            <div className="card text-center py-8">
              <Wallet className="w-10 h-10 text-ink-700 mx-auto mb-2" />
              <p className="text-ink-400 text-sm">No transactions in this period</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(b => (
                <div key={b.id} className="card flex items-center gap-3">
                  <span className="text-2xl">{b.service?.icon || '✂️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-cream text-sm font-medium">{b.service?.name}</p>
                    <p className="text-ink-500 text-xs">{format(new Date(b.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('font-bold text-sm', b.payment_status === 'paid' ? 'text-green-400' : 'text-amber-400')}>
                      +{formatCurrency(b.total_amount)}
                    </p>
                    <p className="text-ink-500 text-xs capitalize">{b.payment_status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
