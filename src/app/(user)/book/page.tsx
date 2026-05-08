'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import type { Service, Barber } from '@/types';
import { formatCurrency, generateTimeSlots } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';

const SERVICES: Service[] = [
  { id:'svc-1', name:'Haircut', description:'Classic haircut with styling', price:299, duration_minutes:30, icon:'✂️', category:'hair', is_active:true },
  { id:'svc-2', name:'Beard Trim', description:'Professional beard shaping', price:149, duration_minutes:20, icon:'🪒', category:'beard', is_active:true },
  { id:'svc-3', name:'Hair + Beard', description:'Complete grooming package', price:399, duration_minutes:45, icon:'💈', category:'combo', is_active:true },
  { id:'svc-4', name:'Wash & Style', description:'Shampoo, condition & style', price:199, duration_minutes:25, icon:'🚿', category:'hair', is_active:true },
  { id:'svc-5', name:'Hot Towel Shave', description:'Traditional straight razor shave', price:249, duration_minutes:30, icon:'🔥', category:'beard', is_active:true },
  { id:'svc-6', name:'Kids Haircut', description:'Haircut for kids under 12', price:199, duration_minutes:25, icon:'👦', category:'hair', is_active:true },
  { id:'svc-7', name:'Hair Color', description:'Professional coloring service', price:799, duration_minutes:60, icon:'🎨', category:'other', is_active:true },
  { id:'svc-8', name:'Head Massage', description:'Relaxing scalp massage', price:199, duration_minutes:20, icon:'💆', category:'other', is_active:true },
];

type Step = 'service'|'slot'|'confirm';

function BookInner() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(params.get('service') ? 'slot' : 'service');
  const [service, setService] = useState<Service|null>(
    SERVICES.find(s=>s.id===params.get('service'))||null
  );
  const [barber, setBarber] = useState<Barber|null>(null);
  const [date, setDate] = useState(new Date());
  const [slot, setSlot] = useState<string|null>(null);
  const [loc] = useState({ lat:28.6139, lng:77.2090, address:'Current Location' });
  const [booking, setBooking] = useState(false);

  const steps: Step[] = ['service','slot','confirm'];
  const stepIdx = steps.indexOf(step);

  useEffect(() => {
    const bid = params.get('barber');
    if (bid) supabase.from('barbers').select('*').eq('id',bid).single().then(({data})=>setBarber(data));
  }, []);

  const dates = Array.from({length:7},(_,i)=>addDays(new Date(),i));
  const slots = service ? generateTimeSlots(date, service.duration_minutes) : [];

  async function confirm() {
    if (!service||!slot) return;
    setBooking(true);
    const { data:{user} } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    const at = new Date(date);
    const [h,m] = slot.split(':').map(Number);
    at.setHours(h,m,0,0);

    const { data, error } = await supabase.from('bookings').insert({
      user_id: user.id,
      barber_id: barber?.id||null,
      service_id: service.id,
      status: 'pending',
      scheduled_at: at.toISOString(),
      address: loc.address,
      lat: loc.lat, lng: loc.lng,
      total_amount: service.price,
      payment_status: 'pending',
    }).select().single();

    if (!error && data) {
      await fetch('/api/bookings/notify',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({bookingId:data.id, lat:loc.lat, lng:loc.lng, specificBarberId:barber?.id}),
      });
      router.replace(`/booking/${data.id}`);
    }
    setBooking(false);
  }

  return (
    <div>
      <header className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={()=>stepIdx>0?setStep(steps[stepIdx-1]):router.back()} className="w-10 h-10 glass rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-cream"/>
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-cream">Book Appointment</h1>
            <p className="text-ink-400 text-xs mt-0.5">Step {stepIdx+1} of 3</p>
          </div>
        </div>
        {/* Progress */}
        <div className="flex gap-1.5">
          {steps.map((_,i)=>(
            <div key={i} className={cn('flex-1 h-1 rounded-full transition-all duration-300', i<=stepIdx?'bg-gold':'bg-ink-700')}/>
          ))}
        </div>
      </header>

      <div className="px-5 pb-6">
        {/* ── Step 1: Service ── */}
        {step==='service' && (
          <div className="animate-slide-up">
            <h2 className="font-display text-lg font-semibold text-cream mb-4">Choose a Service</h2>
            <div className="grid grid-cols-2 gap-3">
              {SERVICES.map(s=>(
                <button key={s.id} onClick={()=>{setService(s);setStep('slot');}}
                  className={cn('card text-left transition-all hover:border-gold/30 active:scale-95',
                    service?.id===s.id && 'border-gold/50 bg-gold/5')}>
                  <span className="text-3xl block mb-2">{s.icon}</span>
                  <p className="text-cream text-sm font-medium">{s.name}</p>
                  <p className="text-ink-400 text-xs mt-0.5 line-clamp-1">{s.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-gold font-bold text-sm">{formatCurrency(s.price)}</span>
                    <span className="text-ink-500 text-xs">{s.duration_minutes}min</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Date & Time ── */}
        {step==='slot' && service && (
          <div className="animate-slide-up space-y-6">
            {/* Selected service */}
            <div className="card flex items-center gap-3">
              <span className="text-3xl">{service.icon}</span>
              <div className="flex-1">
                <p className="text-cream font-medium">{service.name}</p>
                <p className="text-gold font-bold">{formatCurrency(service.price)}</p>
              </div>
              <button onClick={()=>setStep('service')} className="text-gold text-xs font-medium">Change</button>
            </div>

            {/* Date */}
            <div>
              <h3 className="text-cream font-semibold text-sm mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-gold"/>Select Date</h3>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {dates.map((d,i)=>{
                  const sel = format(d,'yyyy-MM-dd')===format(date,'yyyy-MM-dd');
                  return (
                    <button key={i} onClick={()=>{setDate(d);setSlot(null);}}
                      className={cn('flex-shrink-0 w-14 py-3 rounded-xl flex flex-col items-center gap-1 transition-all border',
                        sel?'bg-gold border-gold text-ink-900':'border-gold/10 bg-ink-800/50 text-ink-300 hover:border-gold/25')}>
                      <span className="text-[10px] font-semibold uppercase">{i===0?'Today':format(d,'EEE')}</span>
                      <span className={cn('text-lg font-bold',sel?'text-ink-900':'text-cream')}>{format(d,'d')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time */}
            <div>
              <h3 className="text-cream font-semibold text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-gold"/>Select Time</h3>
              <div className="grid grid-cols-3 gap-2">
                {slots.map(s=>(
                  <button key={s.time} disabled={!s.available} onClick={()=>s.available&&setSlot(s.time)}
                    className={cn('py-3 rounded-xl text-sm font-medium transition-all border',
                      !s.available?'border-transparent text-ink-600 bg-ink-800/30 cursor-not-allowed':
                      slot===s.time?'bg-gold border-gold text-ink-900':
                      'border-gold/10 text-cream bg-ink-800/50 hover:border-gold/30')}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn-primary" disabled={!slot} onClick={()=>slot&&setStep('confirm')}>Continue →</button>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step==='confirm' && service && slot && (
          <div className="animate-slide-up space-y-4">
            <h2 className="font-display text-lg font-semibold text-cream">Confirm Booking</h2>

            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{service.icon}</span>
                <div>
                  <h3 className="font-display text-lg font-bold text-cream">{service.name}</h3>
                  <p className="text-ink-400 text-xs">{service.description}</p>
                </div>
              </div>
              <hr className="border-gold/10"/>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gold flex-shrink-0"/>
                  <span className="text-cream">{format(date,'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-gold flex-shrink-0"/>
                  <span className="text-cream">{slot}</span>
                  <span className="text-ink-400 text-xs">({service.duration_minutes} min)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gold flex-shrink-0"/>
                  <span className="text-cream">{loc.address}</span>
                </div>
              </div>
              <hr className="border-gold/10"/>
              <div className="flex items-center justify-between">
                <span className="text-ink-400 text-sm">Total</span>
                <span className="text-gold font-bold text-xl">{formatCurrency(service.price)}</span>
              </div>
            </div>

            {barber && (
              <div className="card flex items-center gap-3">
                <span className="text-2xl">✂️</span>
                <div><p className="text-ink-400 text-xs">Preferred Barber</p><p className="text-cream font-medium text-sm">{barber.name}</p></div>
              </div>
            )}

            <div className="card">
              <p className="text-ink-400 text-xs leading-relaxed">📍 Your request will be sent to nearby available barbers in real-time. Payment collected after barber accepts.</p>
            </div>

            <button className="btn-primary" onClick={confirm} disabled={booking}>
              {booking ? <><Loader2 className="w-5 h-5 animate-spin"/>Creating Booking...</> : 'Confirm & Book Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-gold animate-spin"/></div>}>
      <BookInner/>
    </Suspense>
  );
}
