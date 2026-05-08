'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK = ['Great haircut!','Very professional','On time','Excellent work','Will book again','Very friendly'];
const LABELS = ['','Poor','Fair','Good','Very Good','Excellent!'];

export default function RatePage({ params }: { params: Promise<{id:string}> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!rating) return;
    setLoading(true);
    const { data:{user} } = await supabase.auth.getUser();
    if (!user) return;
    const { data:bk } = await supabase.from('bookings').select('barber_id').eq('id',id).single();
    if (bk) {
      await supabase.from('ratings').upsert({ booking_id:id, user_id:user.id, barber_id:bk.barber_id, rating, review:review||null });
      await fetch('/api/ratings/update',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({barberId:bk.barber_id}) });
    }
    setDone(true);
    setTimeout(()=>router.replace('/booking'),2000);
  }

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center mb-6 animate-pulse-gold">
        <span className="text-4xl">⭐</span>
      </div>
      <h2 className="font-display text-3xl font-bold text-cream mb-2">Thank You!</h2>
      <p className="text-ink-400">Your review helps others find great barbers.</p>
    </div>
  );

  return (
    <div>
      <header className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={()=>router.back()} className="w-10 h-10 glass rounded-xl flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-cream"/>
        </button>
        <h1 className="font-display text-xl font-bold text-cream">Rate Experience</h1>
      </header>

      <div className="px-5 flex flex-col gap-5 pb-6">
        <div className="card text-center py-8">
          <p className="text-ink-400 text-sm mb-6">How was your experience?</p>
          <div className="flex justify-center gap-2 mb-4">
            {[1,2,3,4,5].map(n=>(
              <button key={n}
                className={cn('text-5xl transition-transform hover:scale-110 active:scale-95',
                  (hovered||rating)>=n ? 'opacity-100' : 'opacity-25')}
                onClick={()=>setRating(n)}
                onMouseEnter={()=>setHovered(n)}
                onMouseLeave={()=>setHovered(0)}>
                ⭐
              </button>
            ))}
          </div>
          <p className="text-cream font-medium">{rating ? LABELS[rating] : 'Tap to rate'}</p>
        </div>

        <div>
          <p className="text-cream text-sm font-medium mb-3">Quick Reviews</p>
          <div className="flex flex-wrap gap-2">
            {QUICK.map(q=>(
              <button key={q} onClick={()=>setReview(p=>p?`${p}, ${q}`:q)}
                className="px-3 py-1.5 glass rounded-full text-xs text-ink-300 hover:border-gold/30 hover:text-gold transition-all">
                {q}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-cream text-sm font-medium mb-2">Write a Review <span className="text-ink-500">(optional)</span></p>
          <textarea className="input resize-none" rows={4} placeholder="Share your experience..." value={review} onChange={e=>setReview(e.target.value)}/>
        </div>

        <button className="btn-primary" onClick={submit} disabled={!rating||loading}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}
