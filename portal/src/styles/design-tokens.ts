export const colors = {
  canvas: '#F5F5F7',
  surface: '#FFFFFF',
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
};

export const layout = {
  sidebarWidth: 240,
  headerHeight: 64,
  contentMaxWidth: 1440,
  sectionSpacing: 24,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

export const shadows = {
  subtle: '0 1px 3px rgba(0, 0, 0, 0.04)',
  card: '0 2px 8px rgba(0, 0, 0, 0.06)',
  elevated: '0 4px 16px rgba(0, 0, 0, 0.08)',
};

export const typography = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  headings: {
    h1: { size: '32px', weight: 600, lineHeight: 1.2 },
    h2: { size: '24px', weight: 600, lineHeight: 1.3 },
    h3: { size: '18px', weight: 600, lineHeight: 1.4 },
  },
  body: {
    large: { size: '16px', weight: 400, lineHeight: 1.5 },
    default: { size: '14px', weight: 400, lineHeight: 1.5 },
    small: { size: '12px', weight: 400, lineHeight: 1.4 },
  },
  metrics: {
    large: { size: '32px', weight: 700 },
    medium: { size: '24px', weight: 600 },
  },
};

export const transitions = {
  default: '150ms ease',
  slow: '300ms ease',
  fast: '100ms ease',
};

export const zIndex = {
  sidebar: 10,
  header: 20,
  overlay: 30,
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

