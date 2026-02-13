/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Obsidian surface layers
        void: '#0D0D0F',
        obsidian: '#141418',
        slate: '#1A1A1F',
        graphite: '#242428',
        smoke: '#2E2E34',
        mist: '#3A3A42',

        // Accent colors
        coral: {
          DEFAULT: '#FF6B4A',
          light: '#FF8F6B',
          glow: 'rgba(255, 107, 74, 0.15)',
        },
        amber: '#FFB74A',
        emerald: '#4AE3A7',
        azure: '#4A9EFF',

        // Text
        text: {
          primary: '#FAFAFA',
          secondary: '#A0A0A8',
          tertiary: '#6A6A72',
          muted: '#4A4A52',
        },

        // Borders
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          hover: 'rgba(255, 255, 255, 0.12)',
          active: 'rgba(255, 107, 74, 0.4)',
        },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '24px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
        md: '0 4px 12px rgba(0, 0, 0, 0.5)',
        lg: '0 8px 32px rgba(0, 0, 0, 0.6)',
        glow: '0 0 40px rgba(255, 107, 74, 0.15)',
        'glow-sm': '0 0 20px rgba(255, 107, 74, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        glow: 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 107, 74, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 107, 74, 0.4)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 40% 20%, rgba(255, 107, 74, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(74, 158, 255, 0.05) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(74, 227, 167, 0.05) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
};

export default config;
