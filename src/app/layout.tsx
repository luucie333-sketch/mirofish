import type { Metadata } from 'next';
import './globals.css';
import { CreditsProvider } from '@/components/providers/CreditsProvider';
import BuyCreditsModal from '@/components/credits/BuyCreditsModal';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'MiroFish | AI Simulation Chat for Scenario Prediction',
  description:
    'Ask a question and predict anything. MiroFish turns your text into graph building, simulation, and reporting through one AI-powered prediction workflow.',
  keywords: 'MiroFish,AI simulation,scenario prediction,multi-agent simulation,prediction workflow',
  authors: [{ name: 'MiroFish' }],
  robots: 'index, follow',
  openGraph: {
    title: 'MiroFish | AI Simulation Chat for Scenario Prediction',
    description: 'Turn text prompts into AI-powered scenario predictions with graph building, simulation, and follow-up chat.',
    url: 'https://mirofish.us/',
    siteName: 'MiroFish',
    images: [{ url: 'https://mirofish.us/og-image.png', width: 1200, height: 630, alt: 'MiroFish — AI Simulation Chat' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MiroFish | AI Simulation Chat for Scenario Prediction',
    description: 'Turn text prompts into AI-powered scenario predictions.',
    images: ['https://mirofish.us/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Source+Code+Pro:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: '#07070F', color: '#E2E2F0' }}>
        <CreditsProvider>
          {children}
          <BuyCreditsModal />
        </CreditsProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
