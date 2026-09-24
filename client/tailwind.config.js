/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo', '"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'monospace'],
        display: ['Archivo', '"IBM Plex Sans"', 'sans-serif'],
      },
      colors: {
        // Remap pure black/white so existing bg-black / text-white soften app-wide
        black: '#0c0c0e',
        white: '#eaeaec',
        // Full zinc scale required (extend replaces the key). Dark end lifted to sit above --surface.
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#2c2c30',
          900: '#1a1a1d',
          950: '#141416',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dark: {
          bg: '#0c0c0e',
          'bg-secondary': '#141416',
          'bg-tertiary': '#1a1a1d',
          border: '#35353b',
          text: '#eaeaec',
          'text-secondary': '#8f8f98',
        },
      },
      // WCAG 2.1 AA (1.4.3) requires 4.5:1 for body text. On this palette's
      // backgrounds zinc-500 measured 3.6–4.0:1 and zinc-600 2.3–2.5:1 — and
      // zinc-600 is what the "est." / "Est. CAD" labels used, so the site's
      // estimate disclosures were its least legible text. #82828b is the
      // smallest lift that clears 4.5:1 on every background in use (page,
      // card, raised card). Text only: borders and fills keep the original
      // shades.
      textColor: {
        zinc: { 500: '#82828b', 600: '#82828b' },
      },
      placeholderColor: {
        zinc: { 500: '#82828b', 600: '#82828b' },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'hero-rise': 'heroRise 0.4s ease-out both',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 0.3s ease-out',
        float: 'float 7s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'grow-x': 'growX 1.1s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        heroRise: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        growX: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
    },
  },
  plugins: [],
};
