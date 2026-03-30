import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from('users')
    .select('credits')
    .eq('id', user.id)
    .single();

  if (!userData || userData.credits < 1) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
  }

  // Use service client to bypass RLS for the update
  const service = createServiceClient();
  const { data: updated, error } = await service
    .from('users')
    .update({ credits: userData.credits - 1, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('credits')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log transaction
  await service.from('transactions').insert({
    user_id: user.id,
    type: 'use',
    amount: -1,
    description: 'Chat message sent',
  });

  return NextResponse.json({ credits: updated.credits });
}
