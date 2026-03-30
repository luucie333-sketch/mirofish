'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft, Menu, RotateCcw, Send, Paperclip, FileText, X,
  Circle, LoaderCircle, CircleCheck, CircleX, Zap, Lock,
  History, Plus, Trash2, MessageSquare,
  Download, Clock, Bot, ArrowRight,
} from 'lucide-react';
import { cn, formatTime, truncateFilename, randomId } from '@/lib/utils';
import UserMenu from '@/components/auth/UserMenu';
import { useCredits } from '@/components/providers/CreditsProvider';

// ─── Types ─────────────────────────────────────────────────────────────────────

type StageStatus = 'pending' | 'running' | 'done' | 'error';

interface Stage {
  id: string;
  label: string;
  status: StageStatus;
  detail?: string;
}

interface SimStats {
  agents: number;
  rounds: number;
  actions: number;
  durationMs: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
  isPipelineError?: boolean;
  isReport?: boolean;
}

interface StoredMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  isError?: boolean;
  isPipelineError?: boolean;
  isReport?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  simulation_id: string | null;
  project_id: string | null;
  pipeline_complete: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_STAGES: Stage[] = [
  { id: 'seed', label: 'Seed Analysis', status: 'pending' },
  { id: 'graph', label: 'Graph Building', status: 'pending' },
  { id: 'simulation', label: 'Multi-Agent Simulation', status: 'pending' },
  { id: 'report', label: 'Structured Report', status: 'pending' },
];

const STAGES_ALL_DONE: Stage[] = INITIAL_STAGES.map((s) => ({ ...s, status: 'done' as StageStatus }));

// ─── Serialization helpers ─────────────────────────────────────────────────────

function serializeMessage(m: Message): StoredMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
    isError: m.isError,
    isPipelineError: m.isPipelineError,
    isReport: m.isReport,
  };
}

function serializeMessages(msgs: Message[]): StoredMessage[] {
  return msgs.filter((m) => !m.isStreaming).map(serializeMessage);
}

function parseMessages(stored: StoredMessage[]): Message[] {
  return stored.map((m) => ({
    id: m.id,
    role: m.role as Message['role'],
    content: m.content,
    timestamp: new Date(m.timestamp),
    isError: m.isError ?? false,
    isPipelineError: m.isPipelineError ?? false,
    isStreaming: false,
    isReport: m.isReport ?? false,
  }));
}

// ─── Session API helpers (module-level, no React state) ────────────────────────

async function patchSession(id: string, data: object): Promise<void> {
  try {
    await fetch(`/api/chat-sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // Non-fatal — session save failure never breaks the pipeline
  }
}

// ─── Date formatting ───────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ─── Pipeline sidebar components ───────────────────────────────────────────────

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

// ─── History sidebar components ────────────────────────────────────────────────

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onLoad: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function SessionItem({ session, isActive, onLoad, onDelete }: SessionItemProps) {
  return (
    <div
      onClick={onLoad}
      className={cn(
        'group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all mb-0.5',
        isActive
          ? 'bg-mint/10 border border-mint/20'
          : 'hover:bg-card border border-transparent hover:border-border/50'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn('font-mono text-xs truncate leading-snug', isActive ? 'text-text' : 'text-muted group-hover:text-text')}>
          {session.title}
        </p>
        <p className="font-mono text-[10px] text-muted/50 mt-0.5">
          {formatRelativeDate(session.updated_at)}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted hover:text-coral hover:bg-coral/10 transition-all shrink-0"
        aria-label="Delete session"
        type="button"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

interface HistorySidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  onNewChat: () => void;
  onLoadSession: (session: ChatSession) => void;
  onDeleteSession: (id: string) => void;
}

function HistorySidebar({
  sessions, activeSessionId, loading, onNewChat, onLoadSession, onDeleteSession,
}: HistorySidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-4 pb-3 border-b border-border shrink-0">
        <p className="font-display font-semibold text-xs text-muted uppercase tracking-widest mb-3 px-1">
          History
        </p>
        <button
          onClick={onNewChat}
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border/60 text-muted hover:text-text hover:border-mint/40 hover:bg-mint/5 transition-all font-mono text-xs"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-4 h-4 rounded-full border-2 border-mint border-t-transparent animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <MessageSquare className="w-6 h-6 text-muted/30" />
            <p className="font-mono text-[10px] text-muted/40 text-center leading-relaxed">
              No past chats yet.<br />Send a message to begin.
            </p>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onLoad={() => onLoadSession(session)}
              onDelete={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Message components ────────────────────────────────────────────────────────

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

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList(key: string) {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={key} className="my-2 space-y-1 pl-1">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mint/60 shrink-0" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  function renderInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-bright">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // H2 heading: ## text
    if (/^##\s/.test(trimmed)) {
      flushList(`list-${idx}`);
      elements.push(
        <h2 key={idx} className="font-display font-700 text-sm text-mint mt-4 mb-1.5 first:mt-0">
          {trimmed.replace(/^##\s+/, '')}
        </h2>
      );
      return;
    }

    // H3 heading: ### text
    if (/^###\s/.test(trimmed)) {
      flushList(`list-${idx}`);
      elements.push(
        <h3 key={idx} className="font-display font-600 text-sm text-mint/80 mt-3 mb-1 first:mt-0">
          {trimmed.replace(/^###\s+/, '')}
        </h3>
      );
      return;
    }

    // Blockquote: > text
    if (/^>\s/.test(trimmed)) {
      flushList(`list-${idx}`);
      elements.push(
        <blockquote key={idx} className="border-l-2 border-mint/30 pl-3 my-2 text-sm text-muted/80 italic leading-relaxed">
          {renderInline(trimmed.replace(/^>\s+/, ''))}
        </blockquote>
      );
      return;
    }

    // Bullet: - or * item
    if (/^[-*]\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ''));
      return;
    }

    // Empty line — flush list, add spacing
    if (trimmed === '') {
      flushList(`list-${idx}`);
      elements.push(<div key={idx} className="h-2" />);
      return;
    }

    // Normal paragraph
    flushList(`list-${idx}`);
    elements.push(
      <p key={idx} className="text-sm leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList('list-end');
  return <div className="space-y-0.5">{elements}</div>;
}

// ─── Report card components ────────────────────────────────────────────────────

function ReportMarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList(key: string) {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={key} className="my-3 space-y-1.5 pl-1">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-text">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-mint/70 shrink-0" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  function renderInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-bright">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (/^##\s/.test(trimmed)) {
      flushList(`list-${idx}`);
      elements.push(
        <div key={idx} className="flex items-center gap-3 mt-6 mb-3 first:mt-0">
          <div className="w-1 h-5 rounded-full bg-mint/60 shrink-0" />
          <h2 className="font-display font-700 text-base text-mint leading-tight">
            {trimmed.replace(/^##\s+/, '')}
          </h2>
        </div>
      );
      return;
    }

    if (/^###\s/.test(trimmed)) {
      flushList(`list-${idx}`);
      elements.push(
        <h3 key={idx} className="font-display font-600 text-sm text-mint/80 mt-4 mb-1.5 first:mt-0">
          {trimmed.replace(/^###\s+/, '')}
        </h3>
      );
      return;
    }

    if (/^>\s/.test(trimmed)) {
      flushList(`list-${idx}`);
      elements.push(
        <blockquote key={idx} className="border-l-2 border-mint/40 pl-4 my-3 italic text-sm text-muted leading-relaxed bg-mint/3 py-2 rounded-r-lg">
          {renderInline(trimmed.replace(/^>\s+/, ''))}
        </blockquote>
      );
      return;
    }

    if (/^[-*]\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ''));
      return;
    }

    if (trimmed === '') {
      flushList(`list-${idx}`);
      elements.push(<div key={idx} className="h-1" />);
      return;
    }

    flushList(`list-${idx}`);
    elements.push(
      <p key={idx} className="text-sm text-text leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList('list-end');
  return <div className="space-y-1">{elements}</div>;
}

function generateSuggestions(sectionTitles: string[]): string[] {
  const dynamic = sectionTitles
    .filter((t) => t.length < 50)
    .slice(0, 2)
    .map((t) => `Tell me more about ${t}`);
  const fallbacks = [
    'What are the main risks I should be aware of?',
    'How confident are you in this prediction?',
    'What alternative scenarios should I consider?',
    'What actions should I take based on this?',
  ];
  return [...dynamic, ...fallbacks].slice(0, 3);
}

function StatsBar({ stats }: { stats: SimStats }) {
  const mins = Math.max(1, Math.round(stats.durationMs / 60000));
  const items = [
    { icon: <Bot className="w-3.5 h-3.5" />, label: `${stats.agents || '–'} Agents`, color: 'text-periwinkle border-periwinkle/20 bg-periwinkle/8' },
    { icon: <RotateCcw className="w-3.5 h-3.5" />, label: `${stats.rounds || '–'} Rounds`, color: 'text-mint border-mint/20 bg-mint/8' },
    { icon: <Zap className="w-3.5 h-3.5" />, label: `${stats.actions || '–'} Actions`, color: 'text-amber border-amber/20 bg-amber/8' },
    { icon: <Clock className="w-3.5 h-3.5" />, label: `${mins} min`, color: 'text-coral border-coral/20 bg-coral/8' },
  ];
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {items.map(({ icon, label, color }) => (
        <div key={label} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-xs', color)}>
          {icon}{label}
        </div>
      ))}
    </div>
  );
}

function ReportCard({
  content, stats, timestamp, onSuggest,
}: { content: string; stats: SimStats | null; timestamp: Date; onSuggest: (q: string) => void }) {
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Prediction Report';
  const body = content.replace(/^#\s+.+\n?/m, '').trim();
  const sections = [...content.matchAll(/^##\s+(.+)/gm)].map((m) => m[1].trim());
  const suggestions = generateSuggestions(sections);

  return (
    <div className="message-in w-full">
      {stats && <StatsBar stats={stats} />}

      <div id="mirofish-report" className="rounded-2xl border border-mint/20 bg-card overflow-hidden shadow-card relative">
        {/* Top accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-mint/50 to-transparent" aria-hidden />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border/60">
          <div className="flex-1 min-w-0 pr-4">
            <span className="inline-flex items-center font-mono text-[10px] text-mint/80 uppercase tracking-widest px-2.5 py-1 rounded-full border border-mint/20 bg-mint/5 mb-3">
              Prediction Report
            </span>
            <h1 className="font-display font-800 text-bright text-xl leading-snug">{title}</h1>
          </div>
          <button
            onClick={() => window.print()}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted hover:text-text hover:border-mint/30 font-mono text-xs transition-all"
            title="Download as PDF"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <ReportMarkdownRenderer content={body} />
        </div>

        {/* Bottom accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />
        <div className="px-6 py-3 flex items-center justify-between">
          <time className="font-mono text-xs text-muted/40">{formatTime(timestamp)}</time>
          <span className="font-mono text-[10px] text-muted/30 uppercase tracking-widest">MiroFish · AI Simulation</span>
        </div>
      </div>

      {/* Follow-up suggestion chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggest(s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-muted hover:border-mint/30 hover:text-mint hover:bg-mint/5 font-mono text-xs transition-all"
          >
            <ArrowRight className="w-3 h-3 shrink-0" />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Pipeline error banners ─────────────────────────────────────────────────── */

function PipelineErrorBanner({
  isSubscribed, onUpgrade, onRetry,
}: { isSubscribed: boolean; onUpgrade: () => void; onRetry: () => void }) {
  if (isSubscribed) {
    return (
      <div className="flex justify-start message-in">
        <div className="max-w-2xl w-full rounded-2xl rounded-bl-sm border border-coral/30 bg-coral/5 px-5 py-4">
          <p className="text-sm text-coral/90 leading-relaxed">
            This prediction encountered an error. Please click{' '}
            <button
              type="button"
              onClick={onRetry}
              className="font-600 underline underline-offset-2 hover:text-coral transition-colors"
            >
              Reset
            </button>{' '}
            and try again. Our team has been notified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start message-in">
      <div className="max-w-2xl w-full rounded-2xl border border-amber/30 bg-amber/5 overflow-hidden">
        {/* Amber top accent */}
        <div className="h-0.5 bg-gradient-to-r from-amber/60 via-amber/80 to-amber/60" aria-hidden />
        <div className="px-5 py-4 space-y-4">
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber" />
            </div>
            <div>
              <p className="font-display font-600 text-sm text-amber/90 mb-1">
                Prediction failed due to high server demand
              </p>
              <p className="text-sm text-muted leading-relaxed">
                Upgrade to{' '}
                <span className="font-600 text-text">Unlimited ($29.99/mo)</span>{' '}
                for priority processing and faster results.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mint text-bg font-display font-700 text-sm hover:bg-mint-dim transition-colors shadow-glow-mint"
            >
              <Zap className="w-3.5 h-3.5" />
              Upgrade Now
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted font-display font-600 text-sm hover:border-mint/30 hover:text-text transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </div>
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
            <polygon points="2,2 2,18 22,10" fill="#0FA68C" opacity="0.9" />
            <polygon points="22,4 22,16 27,10" fill="#0FA68C" opacity="0.55" />
          </svg>
          <span className="font-mono text-xs text-muted">MiroFish</span>
        </div>
        <div className={cn(
          'rounded-2xl rounded-bl-sm px-4 py-3 border',
          isError ? 'border-coral/30 bg-coral/5 text-coral/90' : 'bg-card border-border text-text'
        )}>
          {isError || isStreaming ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {content}
              {isStreaming && <Cursor />}
            </p>
          ) : (
            <MarkdownRenderer content={content} />
          )}
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

function MessageItem({
  role, content, timestamp, isStreaming, isError, isPipelineError, isReport,
  simStats, onSuggest, isSubscribed, onUpgrade, onRetry,
}: Message & {
  simStats?: SimStats | null;
  onSuggest?: (q: string) => void;
  isSubscribed?: boolean;
  onUpgrade?: () => void;
  onRetry?: () => void;
}) {
  if (role === 'user') return <UserMessage content={content} timestamp={timestamp} />;
  if (role === 'system') return <SystemMessage content={content} timestamp={timestamp} />;
  if (isReport) {
    return (
      <ReportCard
        content={content}
        stats={simStats ?? null}
        timestamp={timestamp}
        onSuggest={onSuggest ?? (() => {})}
      />
    );
  }
  if (isPipelineError && onUpgrade && onRetry) {
    return (
      <PipelineErrorBanner
        isSubscribed={isSubscribed ?? false}
        onUpgrade={onUpgrade}
        onRetry={onRetry}
      />
    );
  }
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

// ─── Backend URL ───────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.mirofish.us';

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

async function postJson(url: string, body: object): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

async function postFormData(url: string, data: { simulation_requirement: string; files: File[] }): Promise<any> {
  const fd = new FormData();
  fd.append('simulation_requirement', data.simulation_requirement);
  if (data.files.length > 0) {
    data.files.forEach((f) => fd.append('files', f));
  } else {
    const blob = new Blob([data.simulation_requirement], { type: 'text/plain' });
    fd.append('files', blob, 'prompt.txt');
  }
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

// ─── Polling helpers ───────────────────────────────────────────────────────────

async function pollUntilComplete(url: string, interval: number, timeout: number): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await fetchJson(url);
    const status: string = res.data?.status ?? res.data?.runner_status ?? '';
    if (status === 'completed' || status === 'finished') return res;
    if (status === 'failed' || status === 'error') throw new Error(res.data?.error ?? res.data?.message ?? 'Step failed');
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Polling timed out');
}

async function pollPrepareStatus(simId: string, interval: number, timeout: number): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await postJson(`${API_URL}/api/simulation/prepare/status`, { simulation_id: simId });
    const status: string = res.data?.status ?? '';
    if (status === 'completed' || status === 'ready') return res;
    if (status === 'failed') throw new Error(res.data?.error ?? 'Preparation failed');
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Preparation timed out');
}

async function pollSimulationStatus(
  simId: string,
  interval: number,
  timeout: number,
  onProgress: (data: { current_round: number; total_rounds: number; progress_percent: number }) => void,
): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await fetchJson(`${API_URL}/api/simulation/${simId}/run-status`);
    const d = res.data ?? {};
    const status: string = d.runner_status ?? '';
    if (status === 'completed' || status === 'finished') return res;
    if (status === 'failed') throw new Error(d.error ?? 'Simulation failed');
    if (d.current_round) onProgress(d);
    if (d.progress_percent >= 100 || (d.total_rounds && d.current_round >= d.total_rounds)) return res;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Simulation timed out');
}

async function pollReportStatus(taskId: string, simId: string, interval: number, timeout: number): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await postJson(`${API_URL}/api/report/generate/status`, { task_id: taskId, simulation_id: simId });
    const status: string = res.data?.status ?? '';
    if (status === 'completed') return res;
    if (status === 'failed') throw new Error(res.data?.error ?? 'Report generation failed');
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Report generation timed out');
}

// ─── Chat workspace ────────────────────────────────────────────────────────────

function ChatWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // UI state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Pipeline state
  const [projectId, setProjectId] = useState<string | null>(null);
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [simStats, setSimStats] = useState<SimStats | null>(null);

  // Session history state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const simStartRef = useRef<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]); // always-current messages for async saves
  const sessionIdRef = useRef<string | null>(null); // always-current session ID for async saves

  const { credits, isSubscribed, subscriptionExpires, refresh: refreshCredits, setShowBuyModal } = useCredits();

  // Keep refs in sync with state
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { sessionIdRef.current = activeSessionId; }, [activeSessionId]);

  // Initialise sidebar visibility based on screen width
  useEffect(() => {
    setPipelineOpen(window.innerWidth >= 768);
    setHistoryOpen(window.innerWidth >= 1024);
  }, []);

  useEffect(() => { document.title = 'Chat Workspace | MiroFish'; }, []);

  useEffect(() => {
    if (credits === 0 && !isSubscribed) setShowBuyModal(true);
  }, [credits, isSubscribed, setShowBuyModal]);

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

  // ── Session management ────────────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/chat-sessions');
      if (res.ok) {
        const { sessions: data } = await res.json();
        setSessions(data ?? []);
      }
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const createSession = useCallback(async (title: string, firstMsg: Message): Promise<string | null> => {
    try {
      const res = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, messages: [serializeMessage(firstMsg)] }),
      });
      if (!res.ok) return null;
      const { session } = await res.json();
      sessionIdRef.current = session.id;
      setActiveSessionId(session.id);
      setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
      return session.id;
    } catch {
      return null;
    }
  }, []);

  const loadSession = useCallback(async (session: ChatSession) => {
    try {
      const res = await fetch(`/api/chat-sessions/${session.id}`);
      if (!res.ok) return;
      const { session: full } = await res.json();

      const parsed = parseMessages(full.messages ?? []);
      messagesRef.current = parsed;
      setMessages(parsed);
      setSimulationId(full.simulation_id ?? null);
      setProjectId(full.project_id ?? null);
      setPipelineComplete(full.pipeline_complete ?? false);
      sessionIdRef.current = full.id;
      setActiveSessionId(full.id);

      // Reconstruct chat history for the report agent
      const history = parsed
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.isError)
        .map((m) => ({ role: m.role as string, content: m.content }));
      setChatHistory(history);

      setStages(full.pipeline_complete ? STAGES_ALL_DONE : INITIAL_STAGES);
      setActiveStage(null);
      setInput('');
      setFile(null);
      setOutOfCredits(false);
      setIsLoading(false);
    } catch {
      // Non-fatal
    }
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/chat-sessions/${id}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionIdRef.current === id) {
        sessionIdRef.current = null;
        setActiveSessionId(null);
        messagesRef.current = [];
        setMessages([]);
        setInput('');
        setIsLoading(false);
        setStages(INITIAL_STAGES);
        setActiveStage(null);
        setFile(null);
        setOutOfCredits(false);
        setProjectId(null);
        setSimulationId(null);
        setPipelineComplete(false);
        setChatHistory([]);
        setSimStats(null);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  // ── Stage helpers ─────────────────────────────────────────────────────────────

  const updateStage = useCallback((id: string, status: StageStatus, detail?: string) => {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, status, detail } : s));
    setActiveStage(status === 'running' ? id : null);
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const resetChat = useCallback(() => {
    sessionIdRef.current = null;
    messagesRef.current = [];
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    setIsLoading(false);
    setStages(INITIAL_STAGES);
    setActiveStage(null);
    setFile(null);
    setOutOfCredits(false);
    setProjectId(null);
    setSimulationId(null);
    setPipelineComplete(false);
    setChatHistory([]);
    setSimStats(null);
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (isLoading || !text) return;
    if (!overrideText) setInput('');

    // 1. Client-side credit guard
    if (credits === null) {
      const authCheck = await fetch('/api/credits/balance');
      if (authCheck.status === 401) { router.push('/auth/signin'); return; }
    }
    if (!isSubscribed && credits === 0) {
      setOutOfCredits(true);
      setShowBuyModal(true);
      showToast("You're out of credits. Top up to continue.");
      return;
    }

    // 2. Server-side deduction
    const creditRes = await fetch('/api/credits/use', { method: 'POST' });
    if (creditRes.status === 402) {
      setOutOfCredits(true);
      setShowBuyModal(true);
      showToast("You're out of credits. Top up to continue.");
      return;
    }
    if (creditRes.status === 401) { router.push('/auth/signin'); return; }
    refreshCredits();

    const userMsg: Message = { id: randomId(), role: 'user', content: text, timestamp: new Date() };
    const assistantId = randomId();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: pipelineComplete ? 'Thinking…' : 'Analysing your scenario…',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    if (overrideText) setInput(''); // clear if suggestion filled it
    setIsLoading(true);

    if (!pipelineComplete) {
      // ── FIRST MESSAGE — run full pipeline ───────────────────────────────────
      setStages(INITIAL_STAGES);
      setActiveStage(null);

      // Create session immediately so the user sees it appear in the sidebar
      void createSession(text.slice(0, 50), userMsg);

      let failedStageName = 'pipeline';
      let newProjectId = '';
      let newSimId = '';

      try {
        // Step 0: Context Enrichment
        failedStageName = 'Seed Analysis';
        updateStage('seed', 'running', 'Enriching context…');
        let enrichedText = text;
        try {
          const enrichRes = await fetch('/api/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text }),
          });
          if (enrichRes.ok) {
            const { enriched } = await enrichRes.json();
            if (enriched) enrichedText = enriched;
          }
        } catch {
          // Non-fatal — continue with original prompt
        }

        // Step 1: Ontology / Seed Analysis
        updateStage('seed', 'running', 'Analyzing your scenario…');
        const ontologyRes = await postFormData(`${API_URL}/api/graph/ontology/generate`, {
          simulation_requirement: `Please generate all output in English.\n\n${enrichedText}`,
          files: file ? [file] : [],
        });
        if (!ontologyRes.success) throw new Error(ontologyRes.message ?? 'Ontology generation failed');
        newProjectId = ontologyRes.data.project_id;
        setProjectId(newProjectId);
        const charCount: number = ontologyRes.data.total_text_length ?? 0;
        updateStage('seed', 'done', `Project ${newProjectId} created · ${charCount} chars`);
        if (sessionIdRef.current) void patchSession(sessionIdRef.current, { project_id: newProjectId });

        // Step 2: Graph Building
        failedStageName = 'Graph Building';
        updateStage('graph', 'running', 'Building knowledge graph…');
        const buildRes = await postJson(`${API_URL}/api/graph/build`, { project_id: newProjectId });
        if (!buildRes.success) throw new Error(buildRes.message ?? 'Graph build failed');
        const graphTaskId: string = buildRes.data.task_id;
        await pollUntilComplete(`${API_URL}/api/graph/task/${graphTaskId}`, 3000, 300000);
        updateStage('graph', 'done', 'Knowledge graph built');

        // Step 3: Create Simulation
        failedStageName = 'Multi-Agent Simulation';
        updateStage('simulation', 'running', 'Creating simulation…');
        const simCreateRes = await postJson(`${API_URL}/api/simulation/create`, {
          project_id: newProjectId,
          enable_twitter: true,
          enable_reddit: true,
        });
        if (!simCreateRes.success) throw new Error(simCreateRes.message ?? 'Simulation creation failed');
        newSimId = simCreateRes.data.simulation_id;
        setSimulationId(newSimId);
        if (sessionIdRef.current) void patchSession(sessionIdRef.current, { simulation_id: newSimId });

        // Step 4: Prepare Simulation
        updateStage('simulation', 'running', 'Preparing agents…');
        await postJson(`${API_URL}/api/simulation/prepare`, { simulation_id: newSimId });
        await pollPrepareStatus(newSimId, 5000, 300000);

        // Step 5: Start Simulation (with 429 retry)
        updateStage('simulation', 'running', 'Running simulation…');
        {
          const MAX_START_ATTEMPTS = 20;
          let startAttempt = 0;
          while (true) {
            const startRes = await fetch(`${API_URL}/api/simulation/start`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ simulation_id: newSimId, platform: 'parallel' }),
            });
            if (startRes.ok) break;
            if (startRes.status === 429 && startAttempt < MAX_START_ATTEMPTS) {
              startAttempt++;
              updateStage('simulation', 'running', `Waiting for slot… (attempt ${startAttempt}/${MAX_START_ATTEMPTS})`);
              await new Promise((r) => setTimeout(r, 15000));
            } else {
              const errBody = await startRes.json().catch(() => ({}));
              throw new Error(errBody?.message ?? errBody?.error ?? `Simulation start failed (${startRes.status})`);
            }
          }
          updateStage('simulation', 'running', 'Running simulation…');
        }
        simStartRef.current = Date.now();
        const simResult = await pollSimulationStatus(newSimId, 5000, 1800000, (progress) => {
          updateStage(
            'simulation',
            'running',
            `Round ${progress.current_round}/${progress.total_rounds} — ${progress.progress_percent}%`,
          );
        });
        const simDurationMs = Date.now() - simStartRef.current;
        const sd = simResult?.data ?? {};
        const capturedStats: SimStats = {
          agents: sd.agent_count ?? sd.num_agents ?? sd.total_agents ?? 0,
          rounds: sd.current_round ?? sd.total_rounds ?? 0,
          actions: sd.total_actions ?? sd.action_count ?? sd.num_actions ?? 0,
          durationMs: simDurationMs,
        };
        setSimStats(capturedStats);
        updateStage('simulation', 'done', 'Simulation complete');

        // Step 6: Generate Report
        failedStageName = 'Structured Report';
        updateStage('report', 'running', 'Generating report…');
        const reportGenRes = await postJson(`${API_URL}/api/report/generate`, { simulation_id: newSimId });
        if (!reportGenRes.success) throw new Error(reportGenRes.message ?? 'Report generation failed');
        const reportTaskId: string = reportGenRes.data.task_id;
        await pollReportStatus(reportTaskId, newSimId, 5000, 300000);
        updateStage('report', 'done', 'Report ready');

        // Fetch report and display as first assistant message
        const reportData = await fetchJson(`${API_URL}/api/report/by-simulation/${newSimId}`);
        const rawReport =
          reportData?.data?.markdown_content ??
          reportData?.data?.content ??
          reportData?.data?.report ??
          reportData?.data?.summary ??
          reportData?.data;
        // If rawReport is still a plain object or JSON string, try to extract markdown_content
        let reportContent: string;
        if (typeof rawReport === 'string') {
          try {
            const parsed = JSON.parse(rawReport);
            reportContent = parsed?.markdown_content ?? parsed?.content ?? parsed?.report ?? rawReport;
          } catch {
            reportContent = rawReport;
          }
        } else if (rawReport && typeof rawReport === 'object') {
          reportContent =
            (rawReport as Record<string, string>).markdown_content ??
            (rawReport as Record<string, string>).content ??
            JSON.stringify(rawReport);
        } else {
          reportContent = JSON.stringify(reportData?.data ?? reportData);
        }

        setPipelineComplete(true);
        setChatHistory([
          { role: 'user', content: text },
          { role: 'assistant', content: reportContent },
        ]);
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: reportContent, isStreaming: false, isReport: true } : m)
        );

        // Save completed session
        if (sessionIdRef.current) {
          const messagesToSave = serializeMessages([
            userMsg,
            { id: assistantId, role: 'assistant', content: reportContent, timestamp: new Date(), isReport: true },
          ]);
          await patchSession(sessionIdRef.current, {
            pipeline_complete: true,
            project_id: newProjectId,
            simulation_id: newSimId,
            messages: messagesToSave,
          });
          loadSessions();
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setStages((prev) =>
          prev.map((s) => s.status === 'running' ? { ...s, status: 'error', detail: errMsg } : s)
        );
        setActiveStage(null);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `Pipeline failed at ${failedStageName}: ${errMsg}.`,
                  isStreaming: false,
                  isError: true,
                  isPipelineError: true,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        setFile(null);
      }
    } else {
      // ── FOLLOW-UP MESSAGE — chat with report agent ──────────────────────────
      try {
        const res = await postJson(`${API_URL}/api/report/chat`, {
          simulation_id: simulationId,
          message: text,
          chat_history: chatHistory,
        });
        if (!res.success) throw new Error(res.message ?? 'Chat failed');
        const reply: string =
          res.data?.response ??
          res.data?.message ??
          res.data?.text ??
          JSON.stringify(res.data);

        setChatHistory((prev) => [
          ...prev,
          { role: 'user', content: text },
          { role: 'assistant', content: reply },
        ]);
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: reply, isStreaming: false } : m)
        );

        // Save updated messages to session
        if (sessionIdRef.current) {
          const messagesToSave = serializeMessages([
            ...messagesRef.current.filter((m) => m.id !== assistantId),
            { id: assistantId, role: 'assistant', content: reply, timestamp: new Date() },
          ]);
          await patchSession(sessionIdRef.current, { messages: messagesToSave });
          loadSessions();
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Chat error: ${errMsg}. Please try again.`, isStreaming: false, isError: true }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    }
  }, [input, isLoading, credits, isSubscribed, file, pipelineComplete, simulationId, chatHistory, updateStage, createSession, loadSessions, router, refreshCredits, setShowBuyModal]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  const handleSuggest = useCallback((q: string) => {
    void sendMessage(q);
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

      {/* ── History sidebar ── */}
      <aside className={cn(
        'flex-col border-r border-border bg-surface shrink-0 w-64 transition-all duration-200',
        historyOpen ? 'flex' : 'hidden',
        'lg:flex'
      )}>
        <HistorySidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          loading={sessionsLoading}
          onNewChat={resetChat}
          onLoadSession={loadSession}
          onDeleteSession={deleteSession}
        />
      </aside>

      {/* ── Pipeline sidebar ── */}
      <aside className={cn(
        'flex-col border-r border-border bg-surface shrink-0 w-72 transition-all duration-200',
        pipelineOpen ? 'flex' : 'hidden',
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

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Chat header */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-2 shrink-0">
          {/* Mobile toggle: history */}
          <button
            className="lg:hidden p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface transition-colors"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label="Toggle history"
          >
            <History className="w-5 h-5" />
          </button>
          {/* Mobile toggle: pipeline */}
          <button
            className="md:hidden p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface transition-colors"
            onClick={() => setPipelineOpen((v) => !v)}
            aria-label="Toggle pipeline"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg width="16" height="12" viewBox="0 0 28 20" fill="none" aria-hidden className="shrink-0">
              <polygon points="2,2 2,18 22,10" fill="#0FA68C" opacity="0.9" />
              <polygon points="22,4 22,16 27,10" fill="#0FA68C" opacity="0.55" />
            </svg>
            <span className="font-display font-semibold text-bright text-sm">MiroFish</span>
            <span className={cn('font-mono text-xs ml-1 truncate', statusColor)}>· {pipelineStatus}</span>
          </div>

          {/* Credits in chat header */}
          {credits !== null && (
            <button
              onClick={() => setShowBuyModal(true)}
              className={cn(
                'inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-full border transition-all shrink-0',
                isSubscribed
                  ? 'border-mint/30 bg-mint/10 text-mint hover:bg-mint/20'
                  : credits === 0
                  ? 'border-coral/30 bg-coral/10 text-coral'
                  : 'border-mint/20 bg-mint/5 text-mint hover:bg-mint/10'
              )}
            >
              {isSubscribed ? '∞' : credits === 0 ? <Lock className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {isSubscribed ? 'Unlimited' : credits}
            </button>
          )}

          <UserMenu />

          <button
            onClick={resetChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border transition-all shrink-0"
            aria-label="Reset chat"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </header>

        {/* Credit banner */}
        {credits !== null && (
          <div className={cn(
            'flex items-center justify-between px-4 py-2 border-b text-xs font-mono transition-colors shrink-0',
            isSubscribed
              ? 'bg-mint/5 border-mint/10 text-muted'
              : credits === 0
              ? 'bg-coral/10 border-coral/30 text-coral'
              : 'bg-mint/5 border-mint/10 text-muted'
          )}>
            <span>
              {isSubscribed
                ? <>
                    <span className="text-mint">∞ Unlimited</span> plan active —{' '}
                    expires {new Date(subscriptionExpires!).toLocaleDateString()}
                  </>
                : credits === 0
                ? '⚡ No credits remaining — buy credits to send messages'
                : <><span className="text-mint">⚡ {credits}</span> credit{credits !== 1 ? 's' : ''} remaining</>
              }
            </span>
            <button
              onClick={() => setShowBuyModal(true)}
              className={cn(
                'px-2.5 py-1 rounded-full border text-[10px] font-600 transition-colors',
                !isSubscribed && credits === 0
                  ? 'border-coral/40 bg-coral/10 text-coral hover:bg-coral/20'
                  : 'border-mint/20 bg-mint/5 text-mint hover:bg-mint/10'
              )}
            >
              {isSubscribed ? 'Renew' : 'Buy Credits'}
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
              <svg width="48" height="34" viewBox="0 0 28 20" fill="none" className="opacity-30" aria-hidden>
                <polygon points="2,2 2,18 22,10" fill="#0FA68C" opacity="0.9" />
                <polygon points="22,4 22,16 27,10" fill="#0FA68C" opacity="0.55" />
              </svg>
              <p className="text-muted font-mono text-sm">Enter a prediction prompt to begin</p>
            </div>
          ) : (
            messages.map((m) => (
              <MessageItem
                key={m.id}
                {...m}
                simStats={m.isReport ? simStats : null}
                onSuggest={m.isReport ? handleSuggest : undefined}
                isSubscribed={isSubscribed ?? false}
                onUpgrade={m.isPipelineError ? () => setShowBuyModal(true) : undefined}
                onRetry={m.isPipelineError ? resetChat : undefined}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border p-4">
          {toastMsg && (
            <div className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coral/10 border border-coral/30">
              <Lock className="w-3.5 h-3.5 text-coral shrink-0" />
              <span className="font-mono text-xs text-coral">{toastMsg}</span>
            </div>
          )}

          <div className={cn(
            'relative rounded-xl border bg-surface p-2 focus-within:border-mint/40 transition-colors',
            outOfCredits && credits === 0 && !isSubscribed ? 'border-coral/30' : 'border-border'
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
              placeholder={credits === 0 ? 'Buy credits to continue…' : pipelineComplete ? 'Ask a follow-up question…' : 'Describe your prediction scenario…'}
              rows={1}
              disabled={isLoading}
              className="bg-transparent text-text text-sm placeholder:text-muted/50 w-full px-3 py-2 focus:outline-none resize-none min-h-[36px] max-h-[100px] leading-5 disabled:opacity-60"
            />
            <div className="flex items-center justify-between px-1 pt-1">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isLoading || pipelineComplete}
                className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-card transition-colors disabled:opacity-40"
                aria-label="Attach file"
                type="button"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                onClick={() => sendMessage()}
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
        <div className="flex h-screen items-center justify-center bg-bg">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-mint border-t-transparent animate-spin" />
            <p className="font-mono text-xs text-muted">Loading workspace…</p>
          </div>
        </div>
      }
    >
      <ChatWorkspace />
    </Suspense>
  );
}
