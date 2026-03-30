'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft, Menu, RotateCcw, Send, Paperclip, FileText, X,
  Circle, LoaderCircle, CircleCheck, CircleX, Zap, Lock,
} from 'lucide-react';
import { cn, formatTime, truncateFilename, randomId } from '@/lib/utils';
import UserMenu from '@/components/auth/UserMenu';
import { useCredits } from '@/components/providers/CreditsProvider';

type StageStatus = 'pending' | 'running' | 'done' | 'error';

interface Stage {
  id: string;
  label: string;
  status: StageStatus;
  detail?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
}

const INITIAL_STAGES: Stage[] = [
  { id: 'seed', label: 'Seed Analysis', status: 'pending' },
  { id: 'graph', label: 'Graph Building', status: 'pending' },
  { id: 'simulation', label: 'Multi-Agent Simulation', status: 'pending' },
  { id: 'report', label: 'Structured Report', status: 'pending' },
];

function StageIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case 'running': return <LoaderCircle className="w-4 h-4 text-mint shrink-0 mt-0.5 animate-spin" />;
    case 'done': return <CircleCheck className="w-4 h-4 text-mint shrink-0 mt-0.5" />;
    case 'error': return <CircleX className="w-4 h-4 text-coral shrink-0 mt-0.5" />;
    default: return <Circle className="w-4 h-4 text-muted shrink-0 mt-0.5" />;
  }
}

function StageItem({ stage, isActive }: { stage: Stage; isActive: boolean }) {
  const cls = isActive || stage.status === 'running'
    ? 'bg-mint/5 border border-mint/20'
    : stage.status === 'done' ? 'opacity-80'
    : stage.status === 'error' ? 'border border-coral/20 bg-coral/5'
    : 'opacity-50';
  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg transition-all duration-200', cls)}>
      <StageIcon status={stage.status} />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-text leading-snug">{stage.label}</p>
        {stage.detail && <p className="text-muted text-xs mt-0.5 leading-snug">{stage.detail}</p>}
      </div>
    </div>
  );
}

function PipelineProgress({ stages }: { stages: Stage[] }) {
  const done = stages.filter((s) => s.status === 'done').length;
  const hasError = stages.some((s) => s.status === 'error');
  const pct = stages.length > 0 ? Math.round((done / stages.length) * 100) : 0;
  return (
    <div className="px-4 pb-4">
      <div className="h-0.5 w-full bg-border rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', hasError ? 'bg-coral' : 'bg-mint')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-xs text-muted mt-1.5 text-right">{done}/{stages.length} stages</p>
    </div>
  );
}

function Cursor() {
  return <span className="inline-block w-0.5 h-3.5 bg-mint ml-0.5 align-middle animate-pulse" />;
}

function UserMessage({ content, timestamp }: { content: string; timestamp: Date }) {
  return (
    <div className="flex justify-end message-in">
      <div className="flex flex-col items-end gap-1 max-w-lg">
        <div className="bg-mint/10 border border-mint/20 text-text rounded-2xl rounded-br-sm px-4 py-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
        <time className="font-mono text-xs text-muted/60 pr-1">{formatTime(timestamp)}</time>
      </div>
    </div>
  );
}

function AssistantMessage({
  content, timestamp, isStreaming, isError,
}: { content: string; timestamp: Date; isStreaming?: boolean; isError?: boolean }) {
  return (
    <div className="flex justify-start message-in">
      <div className="flex flex-col items-start gap-1 max-w-2xl">
        <div className="flex items-center gap-1 pl-1">
          <svg width="12" height="9" viewBox="0 0 28 20" fill="none" aria-hidden>
            <polygon points="2,2 2,18 22,10" fill="#64FFDA" opacity="0.9" />
            <polygon points="22,4 22,16 27,10" fill="#64FFDA" opacity="0.55" />
          </svg>
          <span className="font-mono text-xs text-muted">MiroFish</span>
        </div>
        <div className={cn(
          'rounded-2xl rounded-bl-sm px-4 py-3 border',
          isError ? 'border-coral/30 bg-coral/5 text-coral/90' : 'bg-card border-border text-text'
        )}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {content}
            {isStreaming && <Cursor />}
          </p>
        </div>
        <time className="font-mono text-xs text-muted/50 pl-1">{formatTime(timestamp)}</time>
      </div>
    </div>
  );
}

function SystemMessage({ content, timestamp }: { content: string; timestamp: Date }) {
  return (
    <div className="flex justify-center message-in">
      <div className="flex flex-col items-center gap-1">
        <div className="border border-border/50 bg-surface rounded-lg px-4 py-2">
          <p className="font-mono text-xs text-muted">{content}</p>
        </div>
        <time className="font-mono text-xs text-muted/40">{formatTime(timestamp)}</time>
      </div>
    </div>
  );
}

function MessageItem({ role, content, timestamp, isStreaming, isError }: Message) {
  if (role === 'user') return <UserMessage content={content} timestamp={timestamp} />;
  if (role === 'system') return <SystemMessage content={content} timestamp={timestamp} />;
  return <AssistantMessage content={content} timestamp={timestamp} isStreaming={isStreaming} isError={isError} />;
}

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted text-xs font-mono">
      <FileText className="w-3 h-3 text-mint shrink-0" />
      <span className="truncate max-w-[160px]" title={file.name}>{truncateFilename(file.name)}</span>
      <button type="button" onClick={onRemove} aria-label="Remove attached file" className="ml-0.5 text-muted hover:text-coral transition-colors focus:outline-none">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://204.168.158.228:5001';

function ChatWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { credits, refresh: refreshCredits, setShowBuyModal } = useCredits();

  useEffect(() => { document.title = 'Chat Workspace | MiroFish'; }, []);
  useEffect(() => { setSidebarOpen(window.innerWidth > 768); }, []);

  // Auto-open Buy Credits modal when user lands with 0 credits
  useEffect(() => {
    if (credits === 0) {
      setShowBuyModal(true);
    }
  }, [credits, setShowBuyModal]);

  useEffect(() => {
    const p = searchParams.get('prompt');
    if (p) { setInput(decodeURIComponent(p)); textareaRef.current?.focus(); }
  }, [searchParams]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 96) + 'px'; }
  }, [input]);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  }

  const simulateStages = useCallback((signal: AbortSignal): (() => void) => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const steps: [number, string, StageStatus, string | undefined, string | undefined, StageStatus | undefined][] = [
      [800, 'seed', 'running', undefined, undefined, undefined],
      [1800, 'seed', 'done', 'Decomposed 4 seed nodes', 'graph', 'running'],
      [3200, 'graph', 'done', 'Built 12-node graph', 'simulation', 'running'],
      [5200, 'simulation', 'done', 'Ran 8 agent iterations', 'report', 'running'],
      [6800, 'report', 'done', 'Report ready', undefined, undefined],
    ];
    steps.forEach(([delay, id, status, detail, nextId, nextStatus]) => {
      const t = setTimeout(() => {
        if (signal.aborted) return;
        setStages((prev) => prev.map((s) => {
          if (s.id === id) return { ...s, status, detail };
          if (nextId && s.id === nextId && nextStatus) return { ...s, status: nextStatus };
          return s;
        }));
        setActiveStage(nextId ?? (status === 'done' ? null : id));
      }, delay);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const resetChat = useCallback(() => {
    abortController?.abort();
    setMessages([]);
    setInput('');
    setIsLoading(false);
    setStages(INITIAL_STAGES);
    setActiveStage(null);
    setFile(null);
    setAbortController(null);
    setOutOfCredits(false);
  }, [abortController]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (isLoading || !text) return;

    // 1. Client-side credit guard — instant, no round trip
    if (credits === null) {
      // Not loaded yet — verify via API
      const authCheck = await fetch('/api/credits/balance');
      if (authCheck.status === 401) { router.push('/auth/signin'); return; }
    }
    if (credits === 0) {
      setOutOfCredits(true);
      setShowBuyModal(true);
      showToast("You're out of credits. Top up to continue.");
      return;
    }

    // 2. Server-side deduction (also validates auth + balance atomically)
    const creditRes = await fetch('/api/credits/use', { method: 'POST' });
    if (creditRes.status === 402) {
      setOutOfCredits(true);
      setShowBuyModal(true);
      showToast("You're out of credits. Top up to continue.");
      return;
    }
    if (creditRes.status === 401) {
      router.push('/auth/signin');
      return;
    }

    // Credit deducted — update balance display
    refreshCredits();

    const ac = new AbortController();
    setAbortController(ac);

    const userMsg: Message = { id: randomId(), role: 'user', content: text, timestamp: new Date() };
    const assistantId = randomId();
    const assistantMsg: Message = {
      id: assistantId, role: 'assistant', content: 'Analysing your scenario…', timestamp: new Date(), isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);
    setStages(INITIAL_STAGES);
    setActiveStage(null);

    const cancelStages = simulateStages(ac.signal);

    try {
      const body = new FormData();
      body.append('message', text);
      if (file) body.append('file', file);

      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        body,
        signal: ac.signal,
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      const reply = data?.response ?? data?.message ?? data?.text ?? JSON.stringify(data);

      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: reply, isStreaming: false } : m)
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: 'Request cancelled.', isStreaming: false } : m)
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'The prediction engine is currently offline. The backend may be unavailable. You can run your own instance from the GitHub repository.', isStreaming: false, isError: true }
              : m
          )
        );
        setStages((prev) =>
          prev.map((s) => ['pending', 'running'].includes(s.status) ? { ...s, status: 'error' } : s)
        );
      }
    } finally {
      cancelStages();
      setIsLoading(false);
      setFile(null);
      setAbortController(null);
    }
  }, [input, isLoading, credits, file, simulateStages, router, refreshCredits, setShowBuyModal]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  const pipelineStatus = (() => {
    const running = stages.find((s) => s.status === 'running');
    if (running) return running.label;
    if (stages.every((s) => s.status === 'done')) return 'Complete';
    return 'Ready';
  })();
  const statusColor = pipelineStatus === 'Complete' ? 'text-mint' : pipelineStatus === 'Ready' ? 'text-muted' : 'text-mint';

  return (
    <div className="flex h-screen bg-bg text-text overflow-hidden font-body">
      {/* Sidebar */}
      <aside className={cn(
        'flex-col border-r border-border bg-surface shrink-0 w-72 transition-all duration-200',
        sidebarOpen ? 'flex' : 'hidden',
        'md:flex'
      )}>
        <div className="px-4 pt-4 pb-2">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-text transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />Home
          </Link>
        </div>
        <p className="px-4 pt-2 pb-3 font-display font-semibold text-sm text-muted uppercase tracking-widest">
          Prediction Pipeline
        </p>
        <div className="flex flex-col gap-2 p-4 flex-1 overflow-y-auto">
          {stages.map((s) => (
            <StageItem key={s.id} stage={s} isActive={s.id === activeStage} />
          ))}
          <div className="mt-auto pt-4">
            <PipelineProgress stages={stages} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0">
          <button
            className="md:hidden p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface transition-colors"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 flex-1">
            <svg width="16" height="12" viewBox="0 0 28 20" fill="none" aria-hidden>
              <polygon points="2,2 2,18 22,10" fill="#64FFDA" opacity="0.9" />
              <polygon points="22,4 22,16 27,10" fill="#64FFDA" opacity="0.55" />
            </svg>
            <span className="font-display font-semibold text-bright text-sm">MiroFish</span>
            <span className={cn('font-mono text-xs ml-2', statusColor)}>· {pipelineStatus}</span>
          </div>

          {/* Credits in chat header */}
          {credits !== null && (
            <button
              onClick={() => setShowBuyModal(true)}
              className={cn(
                'inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-full border transition-all',
                credits === 0
                  ? 'border-coral/30 bg-coral/10 text-coral'
                  : 'border-mint/20 bg-mint/5 text-mint hover:bg-mint/10'
              )}
            >
              {credits === 0 ? <Lock className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {credits}
            </button>
          )}

          <UserMenu />

          <button
            onClick={resetChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border transition-all"
            aria-label="Reset chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />Reset
          </button>
        </header>

        {/* Credit banner */}
        {credits !== null && (
          <div className={cn(
            'flex items-center justify-between px-4 py-2 border-b text-xs font-mono transition-colors shrink-0',
            credits === 0
              ? 'bg-coral/10 border-coral/30 text-coral'
              : 'bg-mint/5 border-mint/10 text-muted'
          )}>
            <span>
              {credits === 0
                ? '⚡ No credits remaining — buy credits to send messages'
                : <><span className="text-mint">⚡ {credits}</span> credit{credits !== 1 ? 's' : ''} remaining</>
              }
            </span>
            <button
              onClick={() => setShowBuyModal(true)}
              className={cn(
                'px-2.5 py-1 rounded-full border text-[10px] font-600 transition-colors',
                credits === 0
                  ? 'border-coral/40 bg-coral/10 text-coral hover:bg-coral/20'
                  : 'border-mint/20 bg-mint/5 text-mint hover:bg-mint/10'
              )}
            >
              Buy Credits
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
              <svg width="48" height="34" viewBox="0 0 28 20" fill="none" className="opacity-30" aria-hidden>
                <polygon points="2,2 2,18 22,10" fill="#64FFDA" opacity="0.9" />
                <polygon points="22,4 22,16 27,10" fill="#64FFDA" opacity="0.55" />
              </svg>
              <p className="text-muted font-mono text-sm">Enter a prediction prompt to begin</p>
            </div>
          ) : (
            messages.map((m) => <MessageItem key={m.id} {...m} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border p-4">
          {/* Toast */}
          {toastMsg && (
            <div className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coral/10 border border-coral/30">
              <Lock className="w-3.5 h-3.5 text-coral shrink-0" />
              <span className="font-mono text-xs text-coral">{toastMsg}</span>
            </div>
          )}

          <div className={cn(
            'relative rounded-xl border bg-surface p-2 focus-within:border-mint/40 transition-colors',
            outOfCredits && credits === 0 ? 'border-coral/30' : 'border-border'
          )}>
            {file && (
              <div className="mb-2 px-2">
                <FileChip file={file} onRemove={() => setFile(null)} />
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={credits === 0 ? 'Buy credits to continue…' : 'Ask a follow-up question…'}
              rows={1}
              disabled={isLoading}
              className="bg-transparent text-text text-sm placeholder:text-muted/50 w-full px-3 py-2 focus:outline-none resize-none min-h-[36px] max-h-[100px] leading-5 disabled:opacity-60"
            />
            <div className="flex items-center justify-between px-1 pt-1">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-card transition-colors disabled:opacity-40"
                aria-label="Attach file"
                type="button"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-mint text-bg text-xs font-semibold font-mono hover:bg-mint/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-mint"
                aria-label="Send message"
                type="button"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </div>
          <p className="text-center font-mono text-xs text-muted/40 mt-2">
            Enter to send · Shift+Enter for newline · 1 credit per message
          </p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.md,.txt"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#07070F]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#64FFDA] border-t-transparent animate-spin" />
            <p className="font-mono text-xs text-[#60607A]">Loading workspace…</p>
          </div>
        </div>
      }
    >
      <ChatWorkspace />
    </Suspense>
  );
}
