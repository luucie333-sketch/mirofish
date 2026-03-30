import { createClient } from '@/lib/supabase/server';
import { getPackage } from '@/lib/credits';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { packageId, walletType, txHash } = await request.json();

  if (!txHash?.trim()) {
    return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
  }

  const pkg = getPackage(packageId);
  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
  }

  const { error } = await supabase.from('crypto_requests').insert({
    user_id: user.id,
    wallet_type: walletType,
    amount_usd: pkg.price,
    credits_requested: pkg.credits,
    tx_hash: txHash.trim(),
    status: 'pending',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Request submitted. Manual review usually takes 1–24 hours.' });
}
