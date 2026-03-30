import { createClient } from '@/lib/supabase/server';
import { createPayPalOrder } from '@/lib/paypal';
import { SUBSCRIPTION_PLAN } from '@/lib/credits';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const orderId = await createPayPalOrder(SUBSCRIPTION_PLAN.price.toFixed(2), 'subscription');
    return NextResponse.json({ orderId });
  } catch (err) {
    console.error('PayPal create subscription order error:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
