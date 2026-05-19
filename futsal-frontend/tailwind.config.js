/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: '#7c3aed',
        'primary-pressed': '#6d28d9',
        'primary-deep': '#5b21b6',
        'primary-light': '#ede9fe',
        'brand-navy': '#0f0e2a',
        'brand-navy-deep': '#080718',
        'brand-navy-mid': '#1a1940',
        'link-blue': '#2563eb',
        'link-blue-pressed': '#1d4ed8',

        // Brand spectrum
        'brand-pink': '#f472b6',
        'brand-pink-deep': '#be185d',
        'brand-orange': '#fb923c',
        'brand-orange-deep': '#c2410c',
        'brand-purple': '#8b5cf6',
        'brand-purple-300': '#c4b5fd',
        'brand-purple-800': '#5b21b6',
        'brand-teal': '#2dd4bf',
        'brand-green': '#22c55e',
        'brand-yellow': '#facc15',
        'brand-brown': '#92400e',

        // Card tints
        'tint-peach': '#fde8d8',
        'tint-rose': '#fce7f3',
        'tint-mint': '#d1fae5',
        'tint-lavender': '#ede9fe',
        'tint-sky': '#dbeafe',
        'tint-yellow': '#fef9c3',
        'tint-yellow-bold': '#fcd34d',
        'tint-cream': '#fef3c7',
        'tint-gray': '#f3f4f6',

        // Surface
        surface: '#f7f6f3',
        'surface-soft': '#f1f0ec',
        hairline: '#e3e2e0',
        'hairline-soft': '#edeceb',
        'hairline-strong': '#c9c8c5',

        // Text
        'ink-deep': '#191919',
        ink: '#373530',
        charcoal: '#454240',
        slate: '#6b6b6b',
        steel: '#9b9a97',
        stone: '#a8a29e',
        muted: '#d1ccc9',
        'on-dark': '#ffffff',
        'on-dark-muted': 'rgba(255,255,255,0.6)',
        'on-primary': '#ffffff',

        // Semantic
        success: '#16a34a',
        warning: '#d97706',
        error: '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'sans-serif'],
      },
      fontSize: {
        'hero-display': ['80px', { lineHeight: '1.05', letterSpacing: '-2px', fontWeight: '600' }],
        'display-lg': ['56px', { lineHeight: '1.10', letterSpacing: '-1px', fontWeight: '600' }],
        'heading-1': ['48px', { lineHeight: '1.15', letterSpacing: '-0.5px', fontWeight: '600' }],
        'heading-2': ['36px', { lineHeight: '1.20', letterSpacing: '-0.5px', fontWeight: '600' }],
        'heading-3': ['28px', { lineHeight: '1.25', letterSpacing: '0', fontWeight: '600' }],
        'heading-4': ['22px', { lineHeight: '1.30', letterSpacing: '0', fontWeight: '600' }],
        'heading-5': ['18px', { lineHeight: '1.40', letterSpacing: '0', fontWeight: '600' }],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        subtle: 'rgba(15,15,15,0.04) 0px 1px 2px 0px',
        card: 'rgba(15,15,15,0.08) 0px 4px 12px 0px',
        mockup: 'rgba(15,15,15,0.20) 0px 24px 48px -8px',
        modal: 'rgba(15,15,15,0.16) 0px 16px 48px -8px',
      },
      spacing: {
        'section-lg': '96px',
        section: '64px',
        'section-sm': '48px',
      },
      maxWidth: {
        editorial: '1280px',
      },
    },
  },
  plugins: [],
};
