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

  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const service = createServiceClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error } = await service
    .from('users')
    .update({
      subscription_tier: 'unlimited',
      subscription_started_at: now.toISOString(),
      subscription_expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await service.from('transactions').insert({
    user_id: userId,
    type: 'subscription_grant',
    amount: 0,
    description: 'Admin — Manual subscription grant (30 days)',
  });

  return NextResponse.json({ subscriptionExpires: expiresAt.toISOString() });
}
