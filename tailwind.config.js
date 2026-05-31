/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F8F9FA',
        surface: '#FFFFFF',
        primary: '#1A1D23',
        secondary: '#6B7280',
        accent: '#0F6E56',
        'accent-hover': '#085041',
        success: '#1D9E75',
        warning: '#BA7517',
        error: '#A32D2D',
        border: '#E5E7EB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
