/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#010810',
        cyan: {
          DEFAULT: '#00E5FF',
          dim: 'rgba(0,229,255,0.2)',
          glow: 'rgba(0,229,255,0.5)',
        },
        gold: '#FFD700',
        success: '#10B981',
        warning: '#FF6B35',
        danger: '#EF4444',
        card: 'rgba(255,255,255,0.04)',
        'card-border': 'rgba(0,229,255,0.2)',
      },
      fontFamily: {
        heading: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(0,229,255,0.3)',
        'glow-gold': '0 0 20px rgba(255,215,0,0.3)',
      },
    },
  },
  plugins: [],
}
