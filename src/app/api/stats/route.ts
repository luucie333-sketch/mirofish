import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// In-memory cache — 5-minute TTL
let cached: { users: number; at: number } | null = null;
const TTL = 5 * 60 * 1000;

export async function GET() {
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json(
      { users: cached.users },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
    );
  }

  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const users = (!error && count != null) ? count : (cached?.users ?? 120);
    cached = { users, at: Date.now() };

    return NextResponse.json(
      { users },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
    );
  } catch {
    return NextResponse.json(
      { users: cached?.users ?? 120 },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } }
    );
  }
}
