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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const service = createServiceClient();
  const { data, error } = await service
    .from('crypto_requests')
    .select('*, users(email)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { requestId, action, adminNotes } = await request.json();

  if (!['confirm', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const service = createServiceClient();

  // Get the crypto request
  const { data: req, error: fetchErr } = await service
    .from('crypto_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchErr || !req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (req.status !== 'pending') {
    return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
  }

  if (action === 'confirm') {
    // Add credits to user
    const { data: userData } = await service
      .from('users')
      .select('credits')
      .eq('id', req.user_id)
      .single();

    const currentCredits = userData?.credits ?? 0;

    await service
      .from('users')
      .update({
        credits: currentCredits + req.credits_requested,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user_id);

    await service.from('transactions').insert({
      user_id: req.user_id,
      type: 'purchase',
      amount: req.credits_requested,
      description: `Crypto (${req.wallet_type}) — confirmed by admin`,
      crypto_tx_hash: req.tx_hash,
    });
  }

  await service
    .from('crypto_requests')
    .update({
      status: action === 'confirm' ? 'confirmed' : 'rejected',
      admin_notes: adminNotes ?? null,
      confirmed_at: action === 'confirm' ? new Date().toISOString() : null,
    })
    .eq('id', requestId);

  return NextResponse.json({ message: `Request ${action}ed` });
}
