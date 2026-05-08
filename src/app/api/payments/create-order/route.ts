import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: booking, error } = await supabase
      .from('bookings').select('*').eq('id', bookingId).single();
    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    // ── Demo mode (no Razorpay keys) ──────────────────────────
    if (!keyId || !secret || keyId.includes('XXXX')) {
      const mockOrder = {
        id: `order_demo_${Date.now()}`,
        amount: Math.round(booking.total_amount * 100),
        currency: 'INR',
        demo: true,
      };
      await supabase.from('bookings')
        .update({ razorpay_order_id: mockOrder.id }).eq('id', bookingId);
      return NextResponse.json(mockOrder);
    }

    // ── Real Razorpay ─────────────────────────────────────────
    const body = {
      amount: Math.round(booking.total_amount * 100),
      currency: 'INR',
      receipt: `bk_${bookingId.slice(0, 8)}`,
      notes: { booking_id: bookingId },
    };

    const creds = Buffer.from(`${keyId}:${secret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${creds}` },
      body: JSON.stringify(body),
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.error?.description || 'Razorpay error');

    await supabase.from('bookings')
      .update({ razorpay_order_id: order.id }).eq('id', bookingId);

    return NextResponse.json(order);
  } catch (err: any) {
    console.error('[create-order]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
