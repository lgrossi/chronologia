/**
 * Chronologia — Tailwind theme (Caderno / Floresta)
 *
 * Philosophy:
 *  - `paper`, `card`, `ink`, `line`, `accent` = the warm neutral UI system.
 *  - `severity` (blue/orange/purple) is SACRED: only ever encodes symptom
 *    intensity. Never for buttons, links, or chrome.
 *  - The signature card "shadow" is a solid 2px edge (shadow-card), not a blur.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4EEE0',
        card: '#FBF7EC',
        device: '#E7E1D6',
        ink: {
          DEFAULT: '#3A352E',
          soft: '#6F685B',
          faint: '#A79F8E',
        },
        line: {
          DEFAULT: '#E3DAC6',
          soft: '#EDE6D6',
        },
        accent: {
          DEFAULT: '#3F5A43',
          deep: '#33492F',
          soft: '#E5ECDF',
          on: '#F4EEE0',
        },
        // severity inks — reserved for symptom intensity ONLY
        severity: {
          leve: '#3F6DB0',
          moderado: '#E0892B',
          grave: '#8A4EA2',
          'leve-tint': '#E7EEF7',
          'moderado-tint': '#FAF0E2',
          'grave-tint': '#F1EAF5',
        },
        // muted wellbeing tints (Tendências proportion bar)
        well: {
          bom: '#9CB79A',
          mid: '#E7CFA0',
          ruim: '#D9B2AE',
        },
      },
      fontFamily: {
        display: ['"Schibsted Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '11px',
        lg: '14px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '26px',
        fab: '18px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 2px 0 #E3DAC6',
        elevated: '0 12px 26px -12px rgba(63,90,67,0.6)',
        button: '0 8px 18px -8px rgba(63,90,67,0.53)',
        fab: '0 10px 20px -6px rgba(63,90,67,0.53)',
        tabbar: '0 -8px 24px -16px rgba(40,30,20,0.3)',
        sheet: '0 -16px 40px -12px rgba(0,0,0,0.4)',
        toast: '0 12px 28px -10px rgba(0,0,0,0.5)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'none' },
        },
      },
      animation: {
        fadeIn: 'fadeIn .2s ease-out',
        slideUp: 'slideUp .25s ease-out',
      },
    },
  },
  plugins: [],
};
