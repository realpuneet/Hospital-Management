/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        brand: { 50: '#e8f7f8', 100: '#c9edf0', 200: '#9adde2', 300: '#5fc5cd', 400: '#2aa8b3', 500: '#0e8f9b', 600: '#0e7c86', 700: '#0f646d', 800: '#12515a', 900: '#124349' },
        ink: { 50: '#f4f9fa', 100: '#e7eff2', 200: '#d0dde3', 300: '#a9bcc6', 400: '#7a93a1', 500: '#587280', 600: '#435b69', 700: '#334957', 800: '#1f3340', 900: '#0f2230' },
        coral: { 50: '#fff1ee', 100: '#ffe0d9', 400: '#ff8a73', 500: '#fb6a4e', 600: '#e44f33' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(15,34,48,.04), 0 8px 24px -12px rgba(15,34,48,.12)', pop: '0 18px 50px -12px rgba(15,34,48,.25)' },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulseRing: { '0%': { boxShadow: '0 0 0 0 rgba(14,124,134,.45)' }, '100%': { boxShadow: '0 0 0 14px rgba(14,124,134,0)' } },
      },
      animation: { pulseRing: 'pulseRing 1.8s ease-out infinite' },
    },
  },
  plugins: [],
};
