'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Bell, ChevronRight, MapPin, Star } from 'lucide-react';
import type { Service, Booking, UserProfile } from '@/types';
import { formatCurrency, getStatusColor, getStatusLabel, avatarUrl } from '@/lib/utils';
import Image from 'next/image';

const SERVICES: Service[] = [
  { id:'svc-1', name:'Haircut', description:'Classic haircut with styling', price:299, duration_minutes:30, icon:'✂️', category:'hair', is_active:true },
  { id:'svc-2', name:'Beard Trim', description:'Professional beard shaping', price:149, duration_minutes:20, icon:'🪒', category:'beard', is_active:true },
  { id:'svc-3', name:'Hair + Beard', description:'Complete grooming package', price:399, duration_minutes:45, icon:'💈', category:'combo', is_active:true },
  { id:'svc-4', name:'Wash & Style', description:'Shampoo, condition & style', price:199, duration_minutes:25, icon:'🚿', category:'hair', is_active:true },
  { id:'svc-5', name:'Hot Towel Shave', description:'Traditional straight razor shave', price:249, duration_minutes:30, icon:'🔥', category:'beard', is_active:true },
  { id:'svc-6', name:'Hair Color', description:'Professional coloring service', price:799, duration_minutes:60, icon:'🎨', category:'other', is_active:true },
];

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) { router.replace('/'); return; }
    const { data: u } = await supabase.from('users').select('*').eq('id', au.id).single();
    setUser(u);
    const { data: bk } = await supabase
      .from('bookings').select('*,service:services(*),barber:barbers(*)')
      .eq('user_id', au.id).in('status',['pending','accepted','in_progress'])
      .order('created_at',{ascending:false}).limit(3);
    setActiveBookings(bk||[]);
    setLoading(false);
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div>
      {/* Header */}
      <header className="px-5 pt-14 pb-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-ink-400 text-xs mb-0.5">Good day 👋</p>
            <h1 className="font-display text-2xl font-bold text-cream">{user?.name||'Welcome back'}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="relative w-10 h-10 glass rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-ink-300" />
              {activeBookings.length>0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold animate-pulse-gold" />}
            </button>
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gold/20 flex items-center justify-center">
              <Image src={user?.avatar_url||avatarUrl(user?.name||'U')} alt="avatar" width={40} height={40} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Location + Search */}
        <button onClick={()=>router.push('/barbers')} className="w-full glass rounded-2xl px-4 py-3 flex items-center gap-3 mb-3 hover:border-gold/20 transition-all text-left">
          <MapPin className="w-4 h-4 text-gold flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-ink-400">Your location</p>
            <p className="text-sm text-cream truncate">Connaught Place, New Delhi</p>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-500" />
        </button>
      </header>

      {/* Active Bookings */}
      {activeBookings.length > 0 && (
        <section className="px-5 mb-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-semibold text-cream">Active Bookings</h2>
            <Link href="/booking" className="text-gold text-xs font-medium">See all</Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {activeBookings.map(b => (
              <Link key={b.id} href={`/booking/${b.id}`} className="card-interactive flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center text-xl flex-shrink-0">{b.service?.icon||'✂️'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cream">{b.service?.name}</p>
                  <p className="text-xs text-ink-400 mt-0.5 truncate">{b.barber?.name||'Finding barber...'}</p>
                </div>
                <span className={`badge text-[11px] ${getStatusColor(b.status)}`}>{getStatusLabel(b.status)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Services grid */}
      <section className="px-5 mb-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-cream">Services</h2>
          <Link href="/book" className="text-gold text-xs font-medium flex items-center gap-0.5">Book Now<ChevronRight className="w-3.5 h-3.5"/></Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i=><div key={i} className="h-28 rounded-2xl shimmer"/>)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.map(s => (
              <Link key={s.id} href={`/book?service=${s.id}`} className="card group hover:border-gold/25 transition-all">
                <span className="text-3xl block mb-2">{s.icon}</span>
                <p className="text-sm font-medium text-cream group-hover:text-gold transition-colors">{s.name}</p>
                <p className="text-[11px] text-ink-400 mt-0.5 line-clamp-1">{s.description}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-gold font-bold text-sm">{formatCurrency(s.price)}</span>
                  <span className="text-[11px] text-ink-500">{s.duration_minutes}min</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="px-5 mb-7">
        <button onClick={()=>router.push('/barbers')} className="w-full rounded-2xl p-5 text-left relative overflow-hidden" style={{background:'linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C96A)'}}>
          <div className="relative z-10">
            <p className="text-ink-800 text-xs font-semibold mb-1">Ready for a fresh cut?</p>
            <h3 className="font-display text-2xl font-bold text-ink-900 mb-2">Find Nearby Barbers</h3>
            <div className="flex items-center gap-1.5 text-ink-700 text-xs">
              <Star className="w-3.5 h-3.5 fill-ink-700" /><span>Top-rated professionals near you</span>
            </div>
          </div>
          <span className="absolute right-4 bottom-3 text-6xl opacity-20 pointer-events-none">✂️</span>
        </button>
      </section>

      {/* How it works */}
      <section className="px-5 mb-4">
        <h2 className="font-display text-base font-semibold text-cream mb-3">How it works</h2>
        <div className="flex flex-col gap-2.5">
          {[
            {n:'01',t:'Choose a Service',d:'Pick from haircut, beard & more'},
            {n:'02',t:'Get Matched',d:'We find available barbers near you'},
            {n:'03',t:'Get Groomed',d:'Your barber arrives at your location'},
          ].map(({n,t,d})=>(
            <div key={n} className="card flex items-center gap-4">
              <span className="font-mono text-gold font-bold text-sm w-7 flex-shrink-0">{n}</span>
              <div><p className="text-cream text-sm font-medium">{t}</p><p className="text-ink-400 text-xs mt-0.5">{d}</p></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
