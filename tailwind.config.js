/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F5F2EB',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        'card-hover': '#EDE9E0',
        border: '#E0DDD5',
        text: '#1A1A2E',
        bright: '#0A0A18',
        muted: '#6B6B80',
        mint: '#0FA68C',
        'mint-dim': '#0D8F79',
        coral: '#D94F4F',
        periwinkle: '#5B6FDB',
        amber: '#E8A838',
      },
      fontFamily: {
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        body: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Menlo', 'monospace'],
      },
      fontWeight: {
        300: '300',
        400: '400',
        500: '500',
        600: '600',
        700: '700',
        800: '800',
      },
      boxShadow: {
        'glow-mint': '0 0 16px rgba(15, 166, 140, 0.2)',
        'glow-coral': '0 0 16px rgba(217, 79, 79, 0.15)',
        card: '0 1px 3px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)',
      },
      backgroundImage: {
        'radial-mint': 'radial-gradient(ellipse at 50% 0%, rgba(15,166,140,0.06) 0%, transparent 60%)',
        'radial-coral': 'radial-gradient(ellipse at 80% 20%, rgba(232,168,56,0.05) 0%, transparent 50%)',
        'grid': 'linear-gradient(rgba(224,221,213,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(224,221,213,0.6) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '48px 48px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'message-in': 'messageIn 0.3s ease-out',
        shimmer: 'shimmer 0.6s ease-out',
        blink: 'blink 1.2s step-end infinite',
      },
      keyframes: {
        messageIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
