import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getPackage } from '@/lib/credits';
import { NextResponse } from 'next/server';

const DESTINATION_WALLET = '6rtUtvia4cGAxFn6WTuH8d56HgrA6m9DYLQy2ExKXuM5';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const TOLERANCE = 0.97;

async function getSolPrice(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error('Failed to fetch SOL price');
  const data = await res.json();
  return data.solana.usd as number;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { signature, walletAddress, packageId } = await request.json();

  if (!signature?.trim() || !walletAddress?.trim() || !packageId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const pkg = getPackage(packageId);
  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
  }

  const service = createServiceClient();

  // Replay protection
  const { data: existing } = await service
    .from('transactions')
    .select('id')
    .eq('solana_signature', signature)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Transaction already used' }, { status: 400 });
  }

  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed');

    const txResponse = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!txResponse) {
      return NextResponse.json({ error: 'Transaction not found on-chain' }, { status: 400 });
    }

    if (txResponse.meta?.err) {
      return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 });
    }

    const message = txResponse.transaction.message;
    const accountKeys: string[] =
      'getAccountKeys' in message
        ? message.getAccountKeys().staticAccountKeys.map((k: PublicKey) => k.toBase58())
        : (message as { accountKeys: PublicKey[] }).accountKeys.map((k: PublicKey) => k.toBase58());

    const ourIndex = accountKeys.indexOf(DESTINATION_WALLET);
    if (ourIndex === -1) {
      return NextResponse.json({ error: 'Destination wallet not found in transaction' }, { status: 400 });
    }

    const receivedLamports =
      txResponse.meta!.postBalances[ourIndex] - txResponse.meta!.preBalances[ourIndex];
    const receivedSol = receivedLamports / LAMPORTS_PER_SOL;

    const solPrice = await getSolPrice();
    const expectedSol = (pkg.price / solPrice) * TOLERANCE;

    if (receivedSol < expectedSol) {
      return NextResponse.json(
        { error: `Insufficient payment. Received ${receivedSol.toFixed(4)} SOL, expected ~${expectedSol.toFixed(4)} SOL.` },
        { status: 400 }
      );
    }

    // Add credits
    const { data: userData } = await service
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    const currentCredits = userData?.credits ?? 0;

    await service
      .from('users')
      .update({ credits: currentCredits + pkg.credits, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    await service.from('transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount: pkg.credits,
      description: `SOL (Phantom) — ${pkg.label} (${pkg.credits} credits) · ${receivedSol.toFixed(4)} SOL`,
      solana_signature: signature,
      wallet_address: walletAddress,
    });

    return NextResponse.json({ credits: currentCredits + pkg.credits });
  } catch (err) {
    console.error('Solana confirm-credits error:', err);
    return NextResponse.json({ error: 'Failed to verify transaction' }, { status: 500 });
  }
}
