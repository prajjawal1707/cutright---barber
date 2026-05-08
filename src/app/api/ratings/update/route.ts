import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { barberId } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: ratings } = await supabase
      .from('ratings').select('rating').eq('barber_id', barberId);

    if (!ratings || ratings.length === 0) {
      return NextResponse.json({ message: 'No ratings yet' });
    }

    const avg = ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length;

    await supabase.from('barbers').update({
      rating: Math.round(avg * 100) / 100,
      total_reviews: ratings.length,
    }).eq('id', barberId);

    return NextResponse.json({ success: true, avg, total: ratings.length });
  } catch (err: any) {
    console.error('[ratings/update]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
