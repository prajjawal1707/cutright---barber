import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const secret = process.env.RAZORPAY_KEY_SECRET;

    // ── Demo mode ────────────────────────────────────────────
    if (!secret || razorpay_order_id?.startsWith('order_demo_')) {
      await supabase.from('bookings').update({
        payment_status: 'paid',
        payment_id: razorpay_payment_id || `pay_demo_${Date.now()}`,
      }).eq('id', bookingId);
      return NextResponse.json({ success: true, demo: true });
    }

    // ── Verify Razorpay signature ─────────────────────────────
    const expected = createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    await supabase.from('bookings').update({
      payment_status: 'paid',
      payment_id: razorpay_payment_id,
    }).eq('id', bookingId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[verify]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
