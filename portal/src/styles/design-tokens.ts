// Obsidian Precision Design System
// A refined dark-mode aesthetic with deep charcoal surfaces and electric coral accents

export const colors = {
  // Surface layers (darkest to lightest)
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

  // Legacy mapping for compatibility
  surface: '#1A1A1F',
  canvas: '#0D0D0F',
  accent: {
    primary: '#FF6B4A',
    secondary: '#4A9EFF',
    tertiary: '#6A6A72',
  },
  semantic: {
    success: '#4AE3A7',
    warning: '#FFB74A',
    danger: '#FF6B4A',
    neutral: '#6A6A72',
  },
  text: {
    primary: '#FAFAFA',
    secondary: '#A0A0A8',
    tertiary: '#6A6A72',
    muted: '#4A4A52',
    onAccent: '#FFFFFF',
  },
  border: {
    DEFAULT: 'rgba(255, 255, 255, 0.06)',
    hover: 'rgba(255, 255, 255, 0.12)',
    active: 'rgba(255, 107, 74, 0.4)',
  },
};

export const layout = {
  sidebarWidth: 260,
  headerHeight: 64,
  contentMaxWidth: 1400,
  sectionSpacing: 24,
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 24,
};

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
  md: '0 4px 12px rgba(0, 0, 0, 0.5)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.6)',
  glow: '0 0 40px rgba(255, 107, 74, 0.15)',
  'glow-sm': '0 0 20px rgba(255, 107, 74, 0.1)',
};

export const typography = {
  fontFamily: {
    display: 'Outfit, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  headings: {
    h1: { size: '32px', weight: 700, lineHeight: 1.2 },
    h2: { size: '24px', weight: 600, lineHeight: 1.3 },
    h3: { size: '18px', weight: 600, lineHeight: 1.4 },
  },
  body: {
    large: { size: '16px', weight: 400, lineHeight: 1.5 },
    default: { size: '14px', weight: 400, lineHeight: 1.5 },
    small: { size: '12px', weight: 400, lineHeight: 1.4 },
  },
  metrics: {
    large: { size: '32px', weight: 600 },
    medium: { size: '24px', weight: 600 },
  },
};

export const transitions = {
  default: '200ms cubic-bezier(0.16, 1, 0.3, 1)',
  slow: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
  fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
};

export const zIndex = {
  sidebar: 10,
  header: 20,
  overlay: 30,
  modal: 40,
};

export const tokens = {
  colors,
  layout,
  radii,
  shadows,
  typography,
  transitions,
  zIndex,
};

export type DesignTokens = typeof tokens;
