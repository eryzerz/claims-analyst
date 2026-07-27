import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#080808',
        'surface-1': '#111111',
        'surface-2': '#161616',
        'surface-3': '#1c1c1c',
        'border-1': '#1a1a1a',
        'border-2': '#262626',
        'text-primary': '#e6e6e6',
        'text-secondary': '#999999',
        'text-muted': '#666666',
        'severity-critical': '#ff4444',
        'severity-high': '#ff8800',
        'severity-medium': '#ffcc00',
        'severity-low': '#44cc44',
        accent: '#4499cc',
        'accent-dim': 'rgba(68, 153, 204, 0.15)',
      },
      fontFamily: {
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"Cascadia Code"',
          '"SF Mono"',
          'ui-monospace',
          'monospace',
        ],
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.688rem', { lineHeight: '1.3' }],
        sm: ['0.75rem', { lineHeight: '1.3' }],
        base: ['0.8125rem', { lineHeight: '1.3' }],
        lg: ['0.9375rem', { lineHeight: '1.3' }],
        xl: ['1.125rem', { lineHeight: '1.5' }],
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
      },
      borderRadius: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
