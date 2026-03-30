import { createClient, createServiceClient } from '@/lib/supabase/server';
import { capturePayPalOrder } from '@/lib/paypal';
import { SUBSCRIPTION_PLAN } from '@/lib/credits';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId } = await request.json();

  try {
    const { status, amount } = await capturePayPalOrder(orderId);

    if (status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const captured = parseFloat(amount);
    if (captured < SUBSCRIPTION_PLAN.price - 0.01) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }

    const service = createServiceClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await service
      .from('users')
      .update({
        subscription_tier: 'unlimited',
        subscription_started_at: now.toISOString(),
        subscription_expires_at: expiresAt.toISOString(),
        subscription_paypal_id: orderId,
        updated_at: now.toISOString(),
      })
      .eq('id', user.id);

    await service.from('transactions').insert({
      user_id: user.id,
      type: 'subscription_purchase',
      amount: 0,
      description: 'PayPal — Unlimited Monthly Subscription (30 days)',
      paypal_order_id: orderId,
    });

    return NextResponse.json({
      subscription: 'unlimited',
      subscriptionExpires: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('PayPal capture subscription error:', err);
    return NextResponse.json({ error: 'Failed to capture payment' }, { status: 500 });
  }
}
