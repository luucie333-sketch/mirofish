import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ blocked: false });
  }

  // Get IP from Vercel/proxy headers
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Check if email already exists — existing user signing in, always allow
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (existingUser) {
    return NextResponse.json({ blocked: false, existing: true });
  }

  // 2. New signup — check if this IP already signed up in the last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentSignups } = await supabase
    .from('signup_ips')
    .select('id, email')
    .eq('ip_address', ip)
    .gte('created_at', twentyFourHoursAgo);

  if (recentSignups && recentSignups.length > 0) {
    return NextResponse.json({
      blocked: true,
      message:
        'An account was already created from this network. Please sign in with your existing email or purchase credits.',
    });
  }

  return NextResponse.json({ blocked: false, existing: false });
}
