'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Users, Star, LogOut, Loader2 } from 'lucide-react';
import type { Barber, Booking } from '@/types';
import { formatCurrency, avatarUrl } from '@/lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function BarberDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [barber, setBarber] = useState<Barber|null>(null);
  const [todayBk, setTodayBk] = useState<Booking[]>([]);
  const [stats, setStats] = useState({earned:0,jobs:0});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data:{user} } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    const { data:b } = await supabase.from('barbers').select('*').eq('user_id',user.id).single();
    if (!b) { router.replace('/'); return; }
    setBarber(b);

    const now = new Date();
    const { data:bk } = await supabase.from('bookings')
      .select('*,service:services(*),user:users(*)')
      .eq('barber_id',b.id)
      .gte('scheduled_at',startOfDay(now).toISOString())
      .lte('scheduled_at',endOfDay(now).toISOString())
      .order('scheduled_at');
    setTodayBk(bk||[]);

    const { data:done } = await supabase.from('bookings')
      .select('total_amount,payment_status').eq('barber_id',b.id).eq('status','completed');
    const earned = (done||[]).filter(x=>x.payment_status==='paid').reduce((s:number,x:any)=>s+x.total_amount,0);
    setStats({earned,jobs:done?.length||0});
    setLoading(false);
  }

  async function toggle() {
    if (!barber) return;
    setToggling(true);
    await supabase.from('barbers').update({is_available:!barber.is_available}).eq('id',barber.id);
    setBarber({...barber,is_available:!barber.is_available});
    setToggling(false);
  }

  async function signOut() {
    await supabase.auth.signOut(); router.replace('/');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-gold animate-spin"/></div>;

  const isOnline = barber?.is_available;

  return (
    <div>
      <header className="px-5 pt-14 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gold/10">
              <Image src={barber?.avatar_url||avatarUrl(barber?.name||'B')} alt="avatar" width={56} height={56} className="w-full h-full object-cover"/>
            </div>
            <div>
              <p className="text-ink-400 text-xs">Welcome back</p>
              <h1 className="font-display text-xl font-bold text-cream">{barber?.name}</h1>
              <p className="text-xs text-cream mt-0.5">⭐ {barber?.rating?.toFixed(1)||'0.0'} <span className="text-ink-400">({barber?.total_reviews||0})</span></p>
            </div>
          </div>
          <button onClick={signOut} className="w-10 h-10 glass rounded-xl flex items-center justify-center">
            <LogOut className="w-4 h-4 text-ink-400"/>
          </button>
        </div>
      </header>

      {/* Availability toggle */}
      <div className="px-5 mb-6">
        <div className={cn('card flex items-center justify-between transition-all',
          isOnline ? 'border-green-400/25 bg-green-400/5' : '')}>
          <div>
            <p className="font-semibold text-cream">{isOnline ? '🟢 You\'re Online' : '⚫ You\'re Offline'}</p>
            <p className="text-ink-400 text-xs mt-1">{isOnline ? 'Accepting new bookings' : 'Not accepting bookings'}</p>
          </div>
          <button onClick={toggle} disabled={toggling}
            className={cn('relative w-14 h-7 rounded-full transition-all flex-shrink-0',
              isOnline ? 'bg-green-400/30 border border-green-400/40' : 'bg-ink-700 border border-ink-600')}>
            {toggling
              ? <Loader2 className="absolute inset-0 m-auto w-4 h-4 animate-spin text-gold"/>
              : <span className={cn('absolute top-1 w-5 h-5 rounded-full transition-all duration-200',
                  isOnline ? 'left-8 bg-green-400' : 'left-1 bg-ink-400')}/>
            }
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Total Earned', value:formatCurrency(stats.earned), icon:TrendingUp, color:'text-gold' },
            { label:'Jobs Done', value:String(stats.jobs), icon:Users, color:'text-blue-400' },
            { label:'Rating', value:(barber?.rating?.toFixed(1)||'0.0')+'★', icon:Star, color:'text-amber-400' },
          ].map(({label,value,icon:Icon,color})=>(
            <div key={label} className="card text-center py-4">
              <Icon className={cn('w-5 h-5 mx-auto mb-2',color)}/>
              <p className={cn('font-bold text-lg',color)}>{value}</p>
              <p className="text-ink-500 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today's schedule */}
      <div className="px-5">
        <h2 className="font-display text-base font-semibold text-cream mb-3">
          Today's Schedule
          {todayBk.length>0 && <span className="ml-2 text-gold text-sm font-normal">{todayBk.length} apts</span>}
        </h2>
        {todayBk.length===0 ? (
          <div className="card text-center py-8">
            <p className="text-ink-500 text-sm">No appointments today</p>
            {!isOnline && <p className="text-ink-600 text-xs mt-1">Go online to start accepting bookings</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {todayBk.map(b=>(
              <div key={b.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-xl flex-shrink-0">{b.service?.icon||'✂️'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-cream text-sm font-medium truncate">{(b as any).user?.name||'Customer'}</p>
                  <p className="text-ink-400 text-xs">{b.service?.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gold font-bold text-sm">{formatCurrency(b.total_amount)}</p>
                  <p className="text-ink-500 text-xs">{format(new Date(b.scheduled_at),'h:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
