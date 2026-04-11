import Link from 'next/link';
import type { ReactNode } from 'react';
import SiteFooter from '@/components/site/SiteFooter';

export default function LegalPageLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-bg/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 select-none">
            <svg width="24" height="17" viewBox="0 0 28 20" fill="none" aria-hidden>
              <polygon points="2,2 2,18 22,10" fill="#0FA68C" opacity="0.9" />
              <polygon points="22,4 22,16 27,10" fill="#0FA68C" opacity="0.55" />
            </svg>
            <span className="font-display font-700 text-base text-bright">MiroFish</span>
            <span className="font-mono text-xs text-mint/60 -ml-0.5">.us</span>
          </Link>
          <Link href="/" className="font-mono text-xs text-muted hover:text-text transition-colors">
            Back to home
          </Link>
        </div>
      </header>

      <main className="px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl border border-border bg-surface/70 backdrop-blur-sm shadow-card overflow-hidden">
            <div className="px-8 py-10 sm:px-12 sm:py-12 border-b border-border bg-gradient-to-br from-mint/8 via-transparent to-coral/5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-mint mb-4">{eyebrow}</p>
              <h1 className="font-display font-800 text-3xl sm:text-4xl text-bright mb-4">{title}</h1>
              <p className="text-muted text-base sm:text-lg leading-relaxed max-w-2xl">{description}</p>
            </div>
            <div className="px-8 py-10 sm:px-12 sm:py-12">
              {children}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
