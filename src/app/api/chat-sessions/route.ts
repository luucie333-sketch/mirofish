import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, simulation_id, project_id, pipeline_complete, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const title = String(body.title ?? 'New Chat').slice(0, 50);

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      title,
      messages: body.messages ?? [],
      simulation_id: body.simulation_id ?? null,
      project_id: body.project_id ?? null,
      pipeline_complete: body.pipeline_complete ?? false,
    })
    .select('id, title, simulation_id, project_id, pipeline_complete, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
