'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Github, Paperclip, FileText, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import UserMenu from '@/components/auth/UserMenu';

const EXAMPLES = [
  { id: '01', prompt: "If a product raises its price next quarter, how will customer sentiment evolve over six months?" },
  { id: '02', prompt: "What happens to team productivity if a remote-first company mandates two days per week in-office starting in Q3?" },
  { id: '03', prompt: "How will adoption of a new open-source framework progress if a major tech company backs it over the next year?" },
];

function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-display font-600 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-mint text-bg hover:bg-mint-dim shadow-glow-mint focus-visible:ring-mint',
        variant === 'ghost' && 'bg-transparent text-muted hover:text-text hover:bg-white/5 focus-visible:ring-border',
        variant === 'outline' && 'bg-transparent border border-border text-text hover:border-mint/40 hover:text-mint focus-visible:ring-mint',
        size === 'sm' && 'text-xs px-3 py-1.5',
        size === 'md' && 'text-sm px-4 py-2.5',
        size === 'lg' && 'text-base px-6 py-3',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 select-none">
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden>
            <polygon points="2,2 2,18 22,10" fill="#64FFDA" opacity="0.9" />
            <polygon points="22,4 22,16 27,10" fill="#64FFDA" opacity="0.55" />
          </svg>
          <span className="font-display font-700 text-lg text-bright leading-none">MiroFish</span>
          <span className="font-mono text-xs text-mint/60 leading-none -ml-0.5">.us</span>
        </Link>

        <nav className="flex items-center gap-2">
          <a
            href="https://github.com/666ghj/MiroFish"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg text-[#60607A] hover:text-[#E2E2F0] hover:bg-white/5 transition-all duration-200 font-display font-600"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}

function ExamplePrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <section className="max-w-3xl mx-auto px-6">
      <p className="font-mono text-xs text-muted uppercase tracking-widest mb-4">Try an example</p>
      <div className="space-y-3">
        {EXAMPLES.map(({ id, prompt }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(prompt)}
            className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-mint/30 hover:bg-card-hover transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 font-mono text-xs text-muted pt-0.5">#{id}</span>
              <span className="flex-1 text-sm text-text group-hover:text-bright transition-colors duration-200 leading-relaxed">{prompt}</span>
              <ArrowRight className="shrink-0 w-4 h-4 text-muted opacity-0 group-hover:opacity-100 group-hover:text-mint transition-all duration-200 mt-0.5" aria-hidden />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && ['.pdf', '.md', '.txt'].includes('.' + f.name.split('.').pop()?.toLowerCase())) {
      setFile(f);
    }
  }, []);

  async function navigateToChat(p: string, f?: File | null) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    const params = new URLSearchParams({ prompt: encodeURIComponent(p.trim()) });
    if (f) params.set('filename', encodeURIComponent(f.name));
    router.push(`/chat?${params.toString()}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    await navigateToChat(prompt, file);
  }

  return (
    <div
      className="min-h-screen bg-bg text-text font-body"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Header />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
        <div className="bg-radial-mint absolute inset-0 pointer-events-none" aria-hidden />
        <div className="bg-radial-coral absolute inset-0 pointer-events-none" aria-hidden />
        <div className="bg-grid absolute inset-0 opacity-40 pointer-events-none" aria-hidden />

        {isDragging && (
          <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl border-2 border-mint bg-mint/5 backdrop-blur-sm pointer-events-none" aria-hidden>
            <p className="font-display font-600 text-mint text-xl">Drop your file here</p>
          </div>
        )}

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-mint/20 bg-mint/5">
              <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse-slow" aria-hidden />
              <span className="font-mono text-xs text-mint">v0.1 · Open Source</span>
            </div>
          </div>

          <h1 className="font-display font-800 text-5xl sm:text-6xl lg:text-7xl text-bright leading-none tracking-tight">
            Predict Anything.
            <span className="block text-mint glow-mint">Then talk to it.</span>
          </h1>

          <p className="text-muted text-lg leading-relaxed max-w-2xl mx-auto">
            MiroFish turns your question into a complete prediction workflow — seed analysis, graph building,
            multi-agent simulation, and structured reporting. Then you chat with the results.
          </p>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="relative rounded-2xl border border-border bg-surface p-2 shadow-card focus-within:border-mint/40 transition-colors duration-200">
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What do you want to predict? e.g. 'If a product raises its price next quarter, how will customer sentiment evolve?'"
                className="bg-transparent text-text placeholder:text-muted/60 resize-none w-full px-3 py-2 focus:outline-none font-body text-sm leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Attach a file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  {file && (
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-muted">
                      <FileText className="w-3 h-3" aria-hidden />
                      {file.name}
                    </span>
                  )}
                </div>
                <Button type="submit" variant="primary" size="sm">
                  <Zap className="w-4 h-4" />
                  Predict
                </Button>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.md,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              aria-hidden
            />
          </form>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-xs text-muted uppercase tracking-widest text-center mb-12">How it works</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Seed Analysis', desc: 'Your prompt is decomposed into predictive parameters and key entities.', color: 'mint' },
              { num: '02', title: 'Graph Building', desc: 'A knowledge graph is constructed from the scenario\'s key entities.', color: 'periwinkle' },
              { num: '03', title: 'Multi-Agent Sim', desc: 'A multi-agent system runs the prediction across parallel scenarios.', color: 'coral' },
              { num: '04', title: 'Structured Report', desc: 'A confidence-scored report is generated with actionable insights.', color: 'amber' },
            ].map(({ num, title, desc, color }) => (
              <div key={num} className="relative p-5 rounded-xl border border-border bg-card">
                <span className={`font-mono text-xs text-${color} mb-3 block`}>{num}</span>
                <h3 className="font-display font-600 text-bright text-sm mb-2">{title}</h3>
                <p className="font-body text-xs text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section className="pb-24">
        <ExamplePrompts onSelect={(p) => navigateToChat(p)} />
      </section>
    </div>
  );
}
