'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronLeft, Users, Bitcoin, Check, X, RefreshCw, Zap, Shield,
} from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  credits: number;
  role: string;
  created_at: string;
}

interface CryptoRequest {
  id: string;
  user_id: string;
  wallet_type: string;
  amount_usd: number;
  credits_requested: number;
  tx_hash: string;
  status: string;
  created_at: string;
  users: { email: string };
}

function explorerUrl(type: string, hash: string): string {
  if (type === 'BTC') return `https://blockchair.com/bitcoin/transaction/${hash}`;
  if (type === 'ETH') return `https://etherscan.io/tx/${hash}`;
  if (type === 'USDT') return `https://tronscan.org/#/transaction/${hash}`;
  return '#';
}

function TopUpInput({ userId, onTopUp }: { userId: string; onTopUp: () => void }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!amount || parseInt(amount) <= 0) return;
    setLoading(true);
    await fetch('/api/admin/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount: parseInt(amount), note: 'Manual top-up' }),
    });
    setAmount('');
    setLoading(false);
    onTopUp();
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="N"
        className="w-16 bg-card border border-border rounded-lg px-2 py-1 font-mono text-xs text-text placeholder:text-muted/50 focus:outline-none focus:border-mint/40"
      />
      <button
        onClick={submit}
        disabled={!amount || loading}
        className="px-2 py-1 rounded-lg bg-mint/10 border border-mint/20 text-mint font-mono text-xs hover:bg-mint/20 transition-colors disabled:opacity-40"
      >
        {loading ? '…' : '+'}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'users' | 'crypto'>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests, setRequests] = useState<CryptoRequest[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, pendingCrypto: 0, totalCreditsSold: 0 });
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const checkAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    const res = await fetch('/api/credits/balance');
    if (!res.ok) { router.push('/'); return; }
    const { role } = await res.json();
    if (role !== 'admin') { router.push('/'); return; }
    setIsAdmin(true);
  }, [supabase, router]);
  
  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const { users: data } = await res.json();
      setUsers(data ?? []);
      setStats((s) => ({ ...s, totalUsers: data?.length ?? 0 }));
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    const res = await fetch('/api/admin/crypto-requests');
    if (res.ok) {
      const { requests: data } = await res.json();
      setRequests(data ?? []);
      setStats((s) => ({ ...s, pendingCrypto: data?.filter((r: CryptoRequest) => r.status === 'pending').length ?? 0 }));
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchRequests()]);
    setLoading(false);
  }, [fetchUsers, fetchRequests]);

  useEffect(() => { checkAdmin(); }, [checkAdmin]);
  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin, refresh]);

  async function handleCryptoAction(requestId: string, action: 'confirm' | 'reject') {
    await fetch('/api/admin/crypto-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    });
    await refresh();
  }

  if (isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="w-8 h-8 rounded-full border-2 border-mint border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted hover:text-text transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />Back
            </Link>
            <span className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-mint" />
              <span className="font-display font-600 text-bright text-sm">Admin Panel</span>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: <Users className="w-5 h-5 text-mint" />, color: 'mint' },
            { label: 'Pending Crypto', value: stats.pendingCrypto, icon: <Bitcoin className="w-5 h-5 text-amber" />, color: 'amber' },
            { label: 'Total Credits Sold', value: '—', icon: <Zap className="w-5 h-5 text-periwinkle" />, color: 'periwinkle' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-muted uppercase tracking-widest">{label}</span>
                {icon}
              </div>
              <span className={`font-display font-700 text-3xl text-${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl mb-6 w-fit">
          {(['users', 'crypto'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg font-display font-600 text-xs transition-all capitalize ${
                tab === t ? 'bg-card text-bright shadow-card' : 'text-muted hover:text-text'
              }`}
            >
              {t === 'users' ? 'Users' : 'Crypto Requests'}
              {t === 'crypto' && stats.pendingCrypto > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber/20 text-amber text-[10px]">
                  {stats.pendingCrypto}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Users table */}
        {tab === 'users' && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Email', 'Credits', 'Role', 'Joined', 'Top Up'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-xs text-muted uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-text">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-mint">
                        <Zap className="w-3 h-3" />{u.credits}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs px-2 py-0.5 rounded-full border ${
                        u.role === 'admin'
                          ? 'border-mint/30 bg-mint/10 text-mint'
                          : 'border-border text-muted'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <TopUpInput userId={u.id} onTopUp={fetchUsers} />
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center font-mono text-xs text-muted">No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Crypto requests table */}
        {tab === 'crypto' && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['User', 'Type', 'Amount', 'Credits', 'TX Hash', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-xs text-muted uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-text max-w-[140px] truncate">
                      {r.users?.email ?? r.user_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-amber">{r.wallet_type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text">${r.amount_usd}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-mint">
                        <Zap className="w-3 h-3" />{r.credits_requested}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted max-w-[140px]">
                      {r.tx_hash ? (
                        <a
                          href={explorerUrl(r.wallet_type, r.tx_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-periwinkle hover:underline truncate block max-w-[120px]"
                          title={r.tx_hash}
                        >
                          {r.tx_hash.slice(0, 12)}…
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs px-2 py-0.5 rounded-full border ${
                        r.status === 'confirmed' ? 'border-mint/30 bg-mint/10 text-mint' :
                        r.status === 'rejected' ? 'border-coral/30 bg-coral/10 text-coral' :
                        'border-amber/30 bg-amber/10 text-amber'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCryptoAction(r.id, 'confirm')}
                            className="p-1.5 rounded-lg bg-mint/10 border border-mint/20 text-mint hover:bg-mint/20 transition-colors"
                            title="Confirm"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCryptoAction(r.id, 'reject')}
                            className="p-1.5 rounded-lg bg-coral/10 border border-coral/20 text-coral hover:bg-coral/20 transition-colors"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center font-mono text-xs text-muted">No crypto requests</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
