'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, XCircle, MapPin, Clock, Loader2, Bell } from 'lucide-react';
import type { Booking, Barber } from '@/types';
import { formatCurrency, haversineDistance, formatDistance } from '@/lib/utils';
import { format } from 'date-fns';

export default function BarberRequestsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [barber, setBarber] = useState<Barber|null>(null);
  const [pending, setPending] = useState<Booking[]>([]);
  const [recent, setRecent] = useState<Booking[]>([]);
  const [processing, setProcessing] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data:{user} } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    const { data:b } = await supabase.from('barbers').select('*').eq('user_id',user.id).single();
    if (!b) { router.replace('/'); return; }
    setBarber(b);
    await loadRequests(b.id);
    setLoading(false);
    subscribeNotifs(b.id);
  }

  async function loadRequests(bid: string) {
    const { data:notifs } = await supabase.from('notifications')
      .select('booking_id').eq('barber_id',bid).eq('read',false);
    const ids = (notifs||[]).map((n:any)=>n.booking_id);
    if (ids.length>0) {
      const { data } = await supabase.from('bookings')
        .select('*,service:services(*),user:users(*)').in('id',ids).eq('status','pending');
      setPending(data||[]);
    } else setPending([]);
    const { data:rec } = await supabase.from('bookings')
      .select('*,service:services(*),user:users(*)')
      .eq('barber_id',bid).in('status',['accepted','rejected','completed'])
      .order('updated_at',{ascending:false}).limit(5);
    setRecent(rec||[]);
  }

  function subscribeNotifs(bid: string) {
    supabase.channel(`notifs-${bid}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`barber_id=eq.${bid}`},()=>loadRequests(bid))
      .subscribe();
  }

  async function accept(bookingId: string) {
    if (!barber) return;
    setProcessing(bookingId);
    const { data, error } = await supabase.from('bookings')
      .update({barber_id:barber.id, status:'accepted'})
      .eq('id',bookingId).eq('status','pending')
      .select().single();
    if (error||!data) { alert('This booking was already taken by another barber.'); }
    else {
      await supabase.from('notifications').update({read:true}).eq('booking_id',bookingId).eq('barber_id',barber.id);
      await loadRequests(barber.id);
    }
    setProcessing(null);
  }

  async function reject(bookingId: string) {
    if (!barber) return;
    setProcessing(bookingId);
    await supabase.from('notifications').update({read:true}).eq('booking_id',bookingId).eq('barber_id',barber.id);
    await loadRequests(barber.id);
    setProcessing(null);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-gold animate-spin"/></div>;

  return (
    <div>
      <header className="px-5 pt-14 pb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cream">Requests</h1>
        {pending.length>0 && (
          <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-ink-900 font-bold text-sm animate-pulse-gold">
            {pending.length}
          </span>
        )}
      </header>

      <div className="px-5 flex flex-col gap-4 pb-6">
        <h2 className="font-semibold text-cream text-sm">
          Incoming {pending.length>0 && <span className="text-gold">({pending.length})</span>}
        </h2>

        {pending.length===0 ? (
          <div className="card text-center py-10">
            <Bell className="w-10 h-10 text-ink-700 mx-auto mb-3"/>
            <p className="text-ink-400 text-sm">No pending requests</p>
            <p className="text-ink-600 text-xs mt-1">New bookings appear here in real-time</p>
          </div>
        ) : pending.map(bk=>{
          const dist = barber ? haversineDistance(barber.lat,barber.lng,bk.lat,bk.lng) : 0;
          const busy = processing===bk.id;
          return (
            <div key={bk.id} className="card border-gold/25 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] bg-gold/15 text-gold px-2.5 py-1 rounded-full font-medium">🔔 New Request</span>
                <span className="text-ink-500 text-xs">{format(new Date(bk.created_at),'h:mm a')}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{bk.service?.icon||'✂️'}</span>
                <div className="flex-1">
                  <p className="font-semibold text-cream">{bk.service?.name}</p>
                  <p className="text-ink-400 text-sm">{(bk as any).user?.name||'Customer'}</p>
                </div>
                <span className="text-gold font-bold text-xl">{formatCurrency(bk.total_amount)}</span>
              </div>
              <div className="flex items-center gap-4 mb-4 text-xs text-ink-400">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{formatDistance(dist)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{format(new Date(bk.scheduled_at),'h:mm a')}</span>
                <span>{bk.service?.duration_minutes} min</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>reject(bk.id)} disabled={busy}
                  className="btn-danger py-2.5 text-sm disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <XCircle className="w-4 h-4"/>}Decline
                </button>
                <button onClick={()=>accept(bk.id)} disabled={busy}
                  className="flex items-center justify-center gap-2 bg-gold hover:bg-gold-light text-ink-900 font-semibold text-sm py-2.5 rounded-2xl transition-all active:scale-95 disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}Accept
                </button>
              </div>
            </div>
          );
        })}

        {recent.length>0 && (
          <>
            <h2 className="font-semibold text-cream text-sm mt-2">Recent</h2>
            <div className="flex flex-col gap-2">
              {recent.map(bk=>(
                <div key={bk.id} className="card flex items-center gap-3">
                  <span className="text-2xl">{bk.service?.icon||'✂️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-cream text-sm font-medium">{bk.service?.name}</p>
                    <p className="text-ink-400 text-xs">{(bk as any).user?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gold font-bold text-sm">{formatCurrency(bk.total_amount)}</p>
                    <span className={`text-xs capitalize ${bk.status==='accepted'?'text-blue-400':bk.status==='completed'?'text-green-400':'text-red-400'}`}>{bk.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
