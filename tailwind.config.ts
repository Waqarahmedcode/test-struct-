import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { emerald: { 950: '#0B5D3B' }, gold: '#C9A227', pearl: '#FDFBF7', ink: '#14231b' },
    fontFamily: { serif: ['Georgia', 'serif'], sans: ['Inter','Arial','sans-serif'] },
    boxShadow: { soft: '0 8px 35px rgba(6,51,33,0.07)' }
  }}, plugins: []
} satisfies Config;
