import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return data?.role === 'admin' ? user : null;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, amount, note } = await request.json();

  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: userData, error: fetchErr } = await service
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  if (fetchErr || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const newCredits = userData.credits + parseInt(amount, 10);

  await service
    .from('users')
    .update({ credits: newCredits, updated_at: new Date().toISOString() })
    .eq('id', userId);

  await service.from('transactions').insert({
    user_id: userId,
    type: 'topup',
    amount: parseInt(amount, 10),
    description: note ?? `Manual top-up by admin`,
  });

  return NextResponse.json({ credits: newCredits });
}
