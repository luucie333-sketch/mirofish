import { createClient } from '@/lib/supabase/server';
import { createPayPalOrder } from '@/lib/paypal';
import { getPackage } from '@/lib/credits';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { packageId } = await request.json();
  const pkg = getPackage(packageId);

  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
  }

  try {
    const orderId = await createPayPalOrder(pkg.price.toFixed(2), pkg.id);
    return NextResponse.json({ orderId });
  } catch (err) {
    console.error('PayPal create order error:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
