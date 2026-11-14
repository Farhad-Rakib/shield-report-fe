import colors from 'tailwindcss/colors';
import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'InterVariable', ...defaultTheme.fontFamily.sans],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // Single product accent. Use `brand-*` (not blue/cyan) for primary actions, active
        // states and focus rings so the accent can be changed in one place.
        brand: colors.cyan,
        // The dark sidebar / console chrome, identical in light and dark themes.
        console: {
          DEFAULT: '#0b0f14',
          raised: '#121821',
          hover: '#18202b',
          border: '#1f2933',
          muted: '#8b98a9',
        },
        // Severity scale for chart fills, dots and bars. Badge class recipes live in
        // src/index.css (.sev-*) and src/components/ui/Severity/severity.ts.
        sev: {
          critical: '#dc2626',
          high: '#ea580c',
          medium: '#d97706',
          low: '#2563eb',
          info: '#64748b',
        },
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        13: ['0.8125rem', { lineHeight: '1.25rem' }],
      },
      boxShadow: {
        panel: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        overlay: '0 12px 32px -8px rgb(2 6 23 / 0.35), 0 2px 6px -2px rgb(2 6 23 / 0.2)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        indeterminate: {
          '0%': { transform: 'translateX(-100%) scaleX(0.5)' },
          '100%': { transform: 'translateX(200%) scaleX(0.5)' },
        },
        'overlay-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'dialog-in': {
          '0%': { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'radar-sweep': 'radar-sweep 4s linear infinite',
        blink: 'blink 1s step-end infinite',
        indeterminate: 'indeterminate 1.2s ease-in-out infinite',
        'overlay-in': 'overlay-in 0.15s ease-out',
        'dialog-in': 'dialog-in 0.18s ease-out',
        'toast-in': 'toast-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
