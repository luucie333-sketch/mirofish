import type { Metadata } from 'next';
import './globals.css';
import { CreditsProvider } from '@/components/providers/CreditsProvider';
import BuyCreditsModal from '@/components/credits/BuyCreditsModal';

export const metadata: Metadata = {
  metadataBase: new URL('https://mirofish.us'),
  title: 'MiroFish | AI Simulation Chat for Scenario Prediction',
  description:
    'Ask a question and predict anything. MiroFish turns your text into graph building, simulation, and reporting through one AI-powered prediction workflow.',
  keywords: 'MiroFish,AI simulation,scenario prediction,multi-agent simulation,prediction workflow',
  authors: [{ name: 'MiroFish' }],
  robots: 'index, follow',
  alternates: {
    canonical: 'https://mirofish.us/',
  },
  openGraph: {
    title: 'MiroFish | AI Simulation Chat for Scenario Prediction',
    description: 'Turn text prompts into AI-powered scenario predictions with graph building, simulation, and follow-up chat.',
    url: 'https://mirofish.us/',
    siteName: 'MiroFish',
    images: [{ url: 'https://mirofish.us/og-image.png', width: 1200, height: 630, alt: 'MiroFish — AI Simulation Chat' }],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MiroFish | AI Simulation Chat for Scenario Prediction',
    description: 'Turn text prompts into AI-powered scenario predictions.',
    images: ['https://mirofish.us/og-image.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'MiroFish',
  url: 'https://mirofish.us',
  description: 'Multi-agent AI simulation platform for scenario prediction and what-if analysis.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: '1 free prediction, no credit card required',
  },
  publisher: {
    '@type': 'Organization',
    name: 'MiroFish',
    url: 'https://mirofish.us',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#F5F2EB" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Source+Code+Pro:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <CreditsProvider>
          {children}
          <BuyCreditsModal />
        </CreditsProvider>
      </body>
    </html>
  );
}
