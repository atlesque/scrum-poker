import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './composables/**/*.ts',
  ],
  theme: {
    extend: {
      colors: {
        card: {
          back: '#1e3a5f',
          border: '#2d5a8e',
        },
      },
      animation: {
        'card-flip': 'cardFlip 0.4s ease-in-out',
        'fly-up': 'flyUp 0.3s ease-out forwards',
        'fade-in': 'fadeIn 0.2s ease-in',
      },
      keyframes: {
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        flyUp: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '100%': { transform: 'translateY(-200px) scale(1.1)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
