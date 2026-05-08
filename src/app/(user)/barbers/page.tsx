'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Star, Clock, SlidersHorizontal } from 'lucide-react';
import type { Barber } from '@/types';
import { formatDistance, calculateETA, haversineDistance, avatarUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function BarbersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loc, setLoc] = useState({ lat: 28.6139, lng: 77.2090 });
  const [loading, setLoading] = useState(true);
  const [availOnly, setAvailOnly] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => { const l={lat:p.coords.latitude,lng:p.coords.longitude}; setLoc(l); loadBarbers(l); },
      () => loadBarbers(loc)
    );
  }, []);

  async function loadBarbers(l: { lat: number; lng: number }) {
    setLoading(true);
    const { data } = await supabase.from('barbers').select('*');
    const mapped = (data || []).map((b: Barber) => ({
      ...b, distance: haversineDistance(l.lat, l.lng, b.lat, b.lng),
    })).sort((a: Barber, b: Barber) => (a.distance ?? 0) - (b.distance ?? 0));
    setBarbers(mapped);
    setLoading(false);
  }

  const list = availOnly ? barbers.filter(b => b.is_available) : barbers;

  return (
    <div>
      <header className="px-5 pt-14 pb-4">
        <h1 className="font-display text-2xl font-bold text-cream">Nearby Barbers</h1>
        <p className="text-ink-400 text-sm mt-1">{list.length} barbers found near you</p>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setAvailOnly(!availOnly)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all glass',
              availOnly ? 'border-gold/50 text-gold bg-gold/5' : 'text-ink-400')}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />Available only
          </button>
        </div>
      </header>

      <div className="px-5 flex flex-col gap-3 pb-4">
        {loading ? (
          [1,2,3].map(i=><div key={i} className="h-32 rounded-2xl shimmer"/>)
        ) : list.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">✂️</span>
            <p className="text-cream font-medium">No barbers found nearby</p>
            <p className="text-ink-400 text-sm mt-2">Try toggling the filter</p>
          </div>
        ) : list.map(b => (
          <div key={b.id} className="card">
            <div className="flex gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gold/10">
                  <Image src={b.avatar_url||avatarUrl(b.name)} alt={b.name} width={64} height={64} className="w-full h-full object-cover"/>
                </div>
                <span className={cn('absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-ink-900',
                  b.is_available ? 'bg-green-400' : 'bg-ink-500')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-cream text-sm">{b.name}</p>
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full flex-shrink-0',
                    b.is_available ? 'text-green-400 bg-green-400/10' : 'text-ink-400 bg-ink-700/50')}>
                    {b.is_available ? 'Available' : 'Busy'}
                  </span>
                </div>
                <p className="text-xs text-ink-400 mt-0.5 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3"/>{b.address}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-cream">
                    <Star className="w-3 h-3 text-gold fill-gold"/>{b.rating?.toFixed(1)||'4.5'}
                    <span className="text-ink-400">({b.total_reviews||0})</span>
                  </span>
                  {b.distance!=null && <>
                    <span className="flex items-center gap-1 text-xs text-ink-400"><MapPin className="w-3 h-3"/>{formatDistance(b.distance)}</span>
                    <span className="flex items-center gap-1 text-xs text-ink-400"><Clock className="w-3 h-3"/>{calculateETA(b.distance)}</span>
                  </>}
                </div>
                {b.experience_years > 0 && <p className="text-[11px] text-ink-500 mt-0.5">{b.experience_years} yrs experience</p>}
              </div>
            </div>
            <button
              onClick={() => router.push(`/book?barber=${b.id}`)}
              disabled={!b.is_available}
              className={cn('w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                b.is_available
                  ? 'bg-gold text-ink-900 hover:bg-gold-light active:scale-95'
                  : 'bg-ink-800 text-ink-500 cursor-not-allowed')}
            >
              {b.is_available ? 'Book Now' : 'Currently Unavailable'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
