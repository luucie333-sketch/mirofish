import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data, error } = await supabase
    .from('users')
    .select('credits, role, subscription_tier, subscription_expires_at')
    .eq('id', user.id)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    credits: data.credits,
    role: data.role,
    subscription: data.subscription_tier,
    subscriptionExpires: data.subscription_expires_at,
  });
}
