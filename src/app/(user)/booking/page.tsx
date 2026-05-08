'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, ChevronRight } from 'lucide-react';
import type { Booking } from '@/types';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type F = 'all'|'active'|'done';

export default function BookingListPage() {
  const router = useRouter();
  const supabase = createClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<F>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    const { data } = await supabase.from('bookings')
      .select('*,service:services(*),barber:barbers(*)')
      .eq('user_id', user.id).order('created_at',{ascending:false});
    setBookings(data||[]);
    setLoading(false);
  }

  const ACTIVE = ['pending','accepted','in_progress'];
  const list = bookings.filter(b =>
    filter==='active' ? ACTIVE.includes(b.status) :
    filter==='done'   ? !ACTIVE.includes(b.status) : true
  );

  return (
    <div>
      <header className="px-5 pt-14 pb-4">
        <h1 className="font-display text-2xl font-bold text-cream">My Bookings</h1>
        <p className="text-ink-400 text-sm mt-1">{bookings.length} total</p>
        <div className="flex gap-2 mt-4">
          {(['all','active','done'] as F[]).map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize',
                filter===f ? 'bg-gold text-ink-900' : 'glass text-ink-400 hover:text-cream')}>
              {f==='done'?'Completed':f}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 flex flex-col gap-3 pb-4">
        {loading ? [1,2,3].map(i=><div key={i} className="h-24 rounded-2xl shimmer"/>) :
        list.length===0 ? (
          <div className="text-center py-20">
            <CalendarDays className="w-12 h-12 text-ink-700 mx-auto mb-3"/>
            <p className="text-cream font-medium">No bookings found</p>
            <p className="text-ink-400 text-sm mt-1">Your appointments will appear here</p>
            <Link href="/book" className="btn-primary mt-5 max-w-[180px] mx-auto">Book a Service</Link>
          </div>
        ) : list.map(b=>(
          <Link key={b.id} href={`/booking/${b.id}`}
            className="card-interactive flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-2xl flex-shrink-0">
              {b.service?.icon||'✂️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-cream font-medium text-sm">{b.service?.name}</p>
                <span className={`badge text-[11px] ${getStatusColor(b.status)}`}>{getStatusLabel(b.status)}</span>
              </div>
              <p className="text-ink-400 text-xs mt-0.5 truncate">{b.barber?.name||'No barber assigned'}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-ink-500 text-xs">{format(new Date(b.scheduled_at),'MMM d, h:mm a')}</p>
                <p className="text-gold text-sm font-bold">{formatCurrency(b.total_amount)}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-600 flex-shrink-0"/>
          </Link>
        ))}
      </div>
    </div>
  );
}
