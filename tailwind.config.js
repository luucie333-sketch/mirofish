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
        bg: '#07070F',
        surface: '#0E0E1A',
        card: '#111120',
        'card-hover': '#161628',
        border: '#1E1E35',
        text: '#E2E2F0',
        bright: '#FFFFFF',
        muted: '#60607A',
        mint: '#64FFDA',
        'mint-dim': '#3EDAB8',
        coral: '#FF6B6B',
        periwinkle: '#7B8CFF',
        amber: '#FFB347',
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
        'glow-mint': '0 0 20px rgba(100, 255, 218, 0.15)',
        'glow-coral': '0 0 20px rgba(255, 107, 107, 0.15)',
        card: '0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'radial-mint': 'radial-gradient(ellipse at 50% 0%, rgba(100,255,218,0.08) 0%, transparent 60%)',
        'radial-coral': 'radial-gradient(ellipse at 80% 20%, rgba(255,107,107,0.06) 0%, transparent 50%)',
        'grid': 'linear-gradient(rgba(30,30,53,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30,30,53,0.5) 1px, transparent 1px)',
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
