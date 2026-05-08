import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { bookingId, lat, lng, specificBarberId } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let barberIds: string[] = [];

    if (specificBarberId) {
      barberIds = [specificBarberId];
    } else {
      // Find available barbers — try PostGIS function first, fallback to simple query
      const { data: nearby, error } = await supabase.rpc('get_nearby_barbers', {
        user_lat: lat, user_lng: lng, radius_km: 10,
      });

      if (!error && nearby) {
        barberIds = nearby.filter((b: any) => b.is_available).slice(0, 10).map((b: any) => b.id);
      } else {
        // Fallback: just get all available barbers
        const { data: all } = await supabase.from('barbers').select('id').eq('is_available', true);
        barberIds = (all || []).map((b: any) => b.id).slice(0, 10);
      }
    }

    if (barberIds.length === 0) {
      return NextResponse.json({ message: 'No available barbers', notified: 0 });
    }

    const notifications = barberIds.map(barberId => ({
      booking_id: bookingId,
      barber_id: barberId,
      message: 'New booking request near you',
      read: false,
    }));

    const { error: insertErr } = await supabase.from('notifications').insert(notifications);
    if (insertErr) throw insertErr;

    return NextResponse.json({ message: 'Notified', notified: barberIds.length });
  } catch (err: any) {
    console.error('[notify]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
