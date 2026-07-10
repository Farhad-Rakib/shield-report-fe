/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
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
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'radar-sweep': 'radar-sweep 4s linear infinite',
        blink: 'blink 1s step-end infinite',
        indeterminate: 'indeterminate 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
