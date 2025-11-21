/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FFFFFF',
        },
        canvas: {
          DEFAULT: '#F5F5F7',
        },
        accent: {
          primary: '#FF5733',
          secondary: '#4A90E2',
          tertiary: '#A0A0A0',
        },
        semantic: {
          success: '#4CAF50',
          warning: '#FFA726',
          danger: '#FF5733',
          neutral: '#9E9E9E',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#666666',
          tertiary: '#999999',
          onAccent: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Courier New', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.04)',
        card: '0 2px 8px rgba(0, 0, 0, 0.06)',
        elevated: '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
      spacing: {
        4.5: '18px',
        5.5: '22px',
      },
    },
  },
  plugins: [],
};

export default config;

