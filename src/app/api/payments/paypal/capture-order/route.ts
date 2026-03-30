import { createClient, createServiceClient } from '@/lib/supabase/server';
import { capturePayPalOrder } from '@/lib/paypal';
import { getPackage } from '@/lib/credits';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId, packageId } = await request.json();
  const pkg = getPackage(packageId);

  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
  }

  try {
    const { status, amount } = await capturePayPalOrder(orderId);

    if (status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Server-side verification: check captured amount matches expected price
    const captured = parseFloat(amount);
    if (captured < pkg.price - 0.01) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }

    const service = createServiceClient();

    // Get current credits
    const { data: userData } = await service
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    const currentCredits = userData?.credits ?? 0;

    // Add credits
    await service
      .from('users')
      .update({
        credits: currentCredits + pkg.credits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Log transaction
    await service.from('transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount: pkg.credits,
      description: `PayPal — ${pkg.label} (${pkg.credits} credits)`,
      paypal_order_id: orderId,
    });

    return NextResponse.json({ credits: currentCredits + pkg.credits });
  } catch (err) {
    console.error('PayPal capture error:', err);
    return NextResponse.json({ error: 'Failed to capture payment' }, { status: 500 });
  }
}
