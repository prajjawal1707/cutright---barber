'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Phone, Star, MapPin, Clock, CreditCard, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import type { Booking } from '@/types';
import { formatCurrency, getStatusColor, getStatusLabel, avatarUrl } from '@/lib/utils';
import { format } from 'date-fns';
import Image from 'next/image';
import { cn } from '@/lib/utils';

declare global { interface Window { Razorpay: any; } }

export default function BookingDetailPage({ params }: { params: Promise<{id:string}> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [booking, setBooking] = useState<Booking|null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { load(); const unsub = subscribe(); return unsub; }, [id]);

  async function load() {
    const { data } = await supabase.from('bookings')
      .select('*,service:services(*),barber:barbers(*),user:users(*)')
      .eq('id',id).single();
    setBooking(data); setLoading(false);
  }

  function subscribe() {
    const ch = supabase.channel(`bk-${id}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'bookings',filter:`id=eq.${id}`},()=>load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }

  async function cancel() {
    if (!confirm('Cancel this booking?')) return;
    setCancelling(true);
    await supabase.from('bookings').update({status:'cancelled'}).eq('id',id);
    setCancelling(false);
  }

  async function pay() {
    setPaying(true);
    try {
      const res = await fetch('/api/payments/create-order',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({bookingId:id}),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error);

      // Demo mode
      if (order.demo) {
        await fetch('/api/payments/verify',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({razorpay_payment_id:`pay_demo_${Date.now()}`,razorpay_order_id:order.id,razorpay_signature:'demo',bookingId:id}),
        });
        await load(); setPaying(false); return;
      }

      // Real Razorpay
      await new Promise<void>((resolve,reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(); script.onerror = reject;
        document.body.appendChild(script);
      });

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount, currency: order.currency,
        name:'CutRight', description:`Payment for ${booking?.service?.name}`,
        order_id: order.id,
        handler: async (r:any) => {
          await fetch('/api/payments/verify',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({...r,bookingId:id}),
          });
          await load();
        },
        prefill:{ contact: booking?.user?.phone||'', name: booking?.user?.name||'' },
        theme:{ color:'#C9A84C' },
        modal:{ ondismiss:()=>setPaying(false) },
      });
      rzp.open();
    } catch(e:any) { alert(e.message); }
    setPaying(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-gold animate-spin"/></div>;
  if (!booking) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-3"/>
      <p className="text-cream font-medium">Booking not found</p>
      <button onClick={()=>router.back()} className="btn-secondary mt-4 max-w-xs">Go Back</button>
    </div>
  );

  const isPending = booking.status==='pending';
  const isAccepted = booking.status==='accepted';
  const isCompleted = booking.status==='completed';
  const isCancelled = booking.status==='cancelled'||booking.status==='rejected';

  return (
    <div>
      <header className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={()=>router.back()} className="w-10 h-10 glass rounded-xl flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-cream"/>
        </button>
        <h1 className="font-display text-xl font-bold text-cream">Booking Details</h1>
      </header>

      <div className="px-5 flex flex-col gap-4 pb-6">
        {/* Status card */}
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-ink-500 text-xs mb-2">#{id.slice(0,8).toUpperCase()}</p>
              <span className={`badge ${getStatusColor(booking.status)}`}>{getStatusLabel(booking.status)}</span>
            </div>
            <span className="text-4xl">{booking.service?.icon||'✂️'}</span>
          </div>

          {isPending && (
            <div className="flex items-center gap-3 bg-amber-400/8 border border-amber-400/15 rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-amber-400/15 flex items-center justify-center animate-pulse-gold flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-400"/>
              </div>
              <div>
                <p className="text-amber-400 text-sm font-medium">Finding your barber...</p>
                <p className="text-ink-400 text-xs mt-0.5">Nearby barbers are being notified</p>
              </div>
            </div>
          )}
          {isAccepted && booking.barber && (
            <div className="flex items-center gap-3 bg-blue-400/8 border border-blue-400/15 rounded-xl p-3">
              <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0"/>
              <p className="text-blue-400 text-sm font-medium">{booking.barber.name} accepted your booking!</p>
            </div>
          )}
          {isCompleted && (
            <div className="flex items-center gap-3 bg-green-400/8 border border-green-400/15 rounded-xl p-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0"/>
              <p className="text-green-400 text-sm font-medium">Service completed successfully!</p>
            </div>
          )}
          {isCancelled && (
            <div className="flex items-center gap-3 bg-red-400/8 border border-red-400/15 rounded-xl p-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0"/>
              <p className="text-red-400 text-sm font-medium">Booking {booking.status}</p>
            </div>
          )}
        </div>

        {/* Service details */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-cream text-sm">Service Details</h3>
          {[
            ['Service', booking.service?.name],
            ['Date', format(new Date(booking.scheduled_at),'MMM d, yyyy')],
            ['Time', format(new Date(booking.scheduled_at),'h:mm a')],
            ['Duration', `${booking.service?.duration_minutes} min`],
          ].map(([l,v])=>(
            <div key={l} className="flex justify-between text-sm">
              <span className="text-ink-400">{l}</span><span className="text-cream font-medium">{v}</span>
            </div>
          ))}
          <hr className="border-gold/10"/>
          <div className="flex justify-between">
            <span className="text-cream font-medium text-sm">Total</span>
            <span className="text-gold font-bold text-lg">{formatCurrency(booking.total_amount)}</span>
          </div>
        </div>

        {/* Barber info */}
        {booking.barber && (
          <div className="card">
            <h3 className="font-semibold text-cream text-sm mb-3">Your Barber</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gold/10 flex-shrink-0">
                <Image src={booking.barber.avatar_url||avatarUrl(booking.barber.name)} alt={booking.barber.name} width={56} height={56} className="w-full h-full object-cover"/>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-cream">{booking.barber.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-gold fill-gold"/>
                  <span className="text-cream text-xs">{booking.barber.rating?.toFixed(1)||'4.5'}</span>
                  <span className="text-ink-400 text-xs">({booking.barber.total_reviews||0})</span>
                </div>
                <p className="text-ink-400 text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3"/>{booking.barber.address}
                </p>
              </div>
            </div>
            <a href={`tel:${booking.barber.phone}`} className="btn-secondary text-sm py-2.5">
              <Phone className="w-4 h-4 text-gold"/>Call Barber
            </a>
          </div>
        )}

        {/* Payment */}
        {isAccepted && booking.payment_status==='pending' && (
          <div className="card">
            <h3 className="font-semibold text-cream text-sm mb-1">Payment Due</h3>
            <p className="text-ink-400 text-xs mb-4">Complete payment to confirm your appointment</p>
            <div className="flex justify-between mb-4">
              <span className="text-ink-400 text-sm">Amount</span>
              <span className="text-gold font-bold text-xl">{formatCurrency(booking.total_amount)}</span>
            </div>
            <button className="btn-primary" onClick={pay} disabled={paying}>
              {paying ? <><Loader2 className="w-5 h-5 animate-spin"/>Processing...</> : <><CreditCard className="w-5 h-5"/>Pay {formatCurrency(booking.total_amount)}</>}
            </button>
          </div>
        )}

        {booking.payment_status==='paid' && (
          <div className="card flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-green-400"/>
            <div>
              <p className="text-green-400 text-sm font-medium">Payment Successful</p>
              <p className="text-ink-400 text-xs">{booking.payment_id}</p>
            </div>
          </div>
        )}

        {/* Cancel */}
        {isPending && (
          <button className="btn-danger" onClick={cancel} disabled={cancelling}>
            {cancelling ? <Loader2 className="w-5 h-5 animate-spin"/> : <XCircle className="w-5 h-5"/>}
            Cancel Booking
          </button>
        )}

        {/* Rate */}
        {isCompleted && booking.payment_status==='paid' && (
          <a href={`/rate/${id}`} className="btn-primary">
            <Star className="w-5 h-5"/>Rate Your Experience
          </a>
        )}
      </div>
    </div>
  );
}
