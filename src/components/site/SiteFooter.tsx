import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/30 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 mb-3 select-none">
              <svg width="24" height="17" viewBox="0 0 28 20" fill="none" aria-hidden>
                <polygon points="2,2 2,18 22,10" fill="#0FA68C" opacity="0.9" />
                <polygon points="22,4 22,16 27,10" fill="#0FA68C" opacity="0.55" />
              </svg>
              <span className="font-display font-700 text-base text-bright">MiroFish</span>
              <span className="font-mono text-xs text-mint/60 -ml-0.5">.us</span>
            </Link>
            <p className="font-body text-sm text-muted leading-relaxed">
              Multi-agent AI simulation for predicting how any scenario plays out.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <p className="font-mono text-xs text-muted/50 uppercase tracking-widest mb-3">Product</p>
              <div className="space-y-2">
                <a href="/#demo" className="block font-body text-sm text-muted hover:text-text transition-colors">See a Demo</a>
                <a href="/#how-it-works" className="block font-body text-sm text-muted hover:text-text transition-colors">How It Works</a>
                <a href="/#pricing" className="block font-body text-sm text-muted hover:text-text transition-colors">Pricing</a>
                <a href="/#faq" className="block font-body text-sm text-muted hover:text-text transition-colors">FAQ</a>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs text-muted/50 uppercase tracking-widest mb-3">Company</p>
              <div className="space-y-2">
                <Link href="/privacy-policy" className="block font-body text-sm text-muted hover:text-text transition-colors">Privacy Policy</Link>
                <Link href="/terms-of-service" className="block font-body text-sm text-muted hover:text-text transition-colors">Terms of Service</Link>
                <Link href="/contact-us" className="block font-body text-sm text-muted hover:text-text transition-colors">Contact Us</Link>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs text-muted/50 uppercase tracking-widest mb-3">Account</p>
              <div className="space-y-2">
                <Link href="/auth/signin" className="block font-body text-sm text-muted hover:text-text transition-colors">Sign In</Link>
                <Link href="/chat" className="block font-body text-sm text-muted hover:text-text transition-colors">Try It Free</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <p className="font-mono text-xs text-muted/40">© 2026 MiroFish. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse-slow" aria-hidden />
            <span className="font-mono text-xs text-muted/50">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
