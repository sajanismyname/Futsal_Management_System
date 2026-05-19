/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#000000',
        'surface-soft': '#0d0d0d',
        'surface-card': '#141414',
        'surface-elevated': '#1f1f1f',
        hairline: '#262626',
        'hairline-strong': '#3a3a3a',
        'on-dark': '#ffffff',
        body: '#cccccc',
        'body-strong': '#e6e6e6',
        muted: '#999999',
        'muted-soft': '#666666',
        link: '#c3d9f3',
        warning: '#d4a017',
        success: '#5fa657',
      },
      fontFamily: {
        display: ['"Saira Condensed"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Garamond', '"Times New Roman"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'monospace'],
      },
      fontSize: {
        'display-xl': ['64px', { lineHeight: '1.1', letterSpacing: '4px' }],
        'display-lg': ['48px', { lineHeight: '1.15', letterSpacing: '3px' }],
        'display-md': ['32px', { lineHeight: '1.2', letterSpacing: '2px' }],
        'display-sm': ['24px', { lineHeight: '1.3', letterSpacing: '1.5px' }],
        wordmark: ['14px', { lineHeight: '1.0', letterSpacing: '6px' }],
        'title-md': ['20px', { lineHeight: '1.3', letterSpacing: '1px' }],
        'title-sm': ['16px', { lineHeight: '1.3', letterSpacing: '1.5px' }],
        'caption-upper': ['11px', { lineHeight: '1.4', letterSpacing: '2px' }],
        'body-md': ['16px', { lineHeight: '1.5', letterSpacing: '0' }],
        'body-sm': ['14px', { lineHeight: '1.5', letterSpacing: '0' }],
        btn: ['14px', { lineHeight: '1.0', letterSpacing: '2.5px' }],
        'nav-link': ['12px', { lineHeight: '1.4', letterSpacing: '2px' }],
      },
      borderRadius: {
        none: '0px',
        pill: '9999px',
        full: '9999px',
      },
      spacing: {
        section: '120px',
        xxl: '64px',
        xl2: '40px',
      },
    },
  },
  plugins: [],
};
