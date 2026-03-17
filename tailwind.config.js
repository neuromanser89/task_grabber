/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/**/*.{html,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0F0F0F',
          secondary: '#1A1A2E',
          tertiary: '#16213E',
          card: '#0F0F1A',
          'card-hover': '#16162A',
        },
        glass: {
          light: 'rgba(255,255,255,0.05)',
          medium: 'rgba(255,255,255,0.08)',
          heavy: 'rgba(255,255,255,0.12)',
        },
        accent: {
          blue: '#3B82F6',
          purple: '#8B5CF6',
          amber: '#F59E0B',
          green: '#10B981',
          red: '#EF4444',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-scale': 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInScale: {
          from: { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.15), 0 0 60px rgba(59, 130, 246, 0.05)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.15), 0 0 60px rgba(139, 92, 246, 0.05)',
        'glow-sm': '0 0 10px rgba(255, 255, 255, 0.03)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.05)',
        'drag': '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 2px rgba(255, 255, 255, 0.1)',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
}
