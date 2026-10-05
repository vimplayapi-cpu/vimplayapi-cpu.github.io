import type { Config } from 'tailwindcss';

/**
 * Live Miracle design system.
 *
 * Ground is a graded midnight/charcoal stack rather than pure black so the
 * studio photography (which is itself very dark in several sets) still separates
 * from the page. The single brand accent is a broadcast signal cyan; per-studio
 * accents are injected at runtime as the --studio-accent custom property.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ground stack, darkest first.
        void: '#FFFFFF',
        midnight: '#F7F5F2',
        charcoal: '#F0ECE7',
        graphite: '#E7E1D9',
        slate: '#D5CEC5',
        ash: '#B5AAA0',

        // Type.
        chalk: 'rgb(var(--ink) / <alpha-value>)',
        mist: 'rgb(var(--body-ink) / <alpha-value>)',
        muted: 'rgb(var(--muted-ink) / <alpha-value>)',

        // Brand accent — broadcast signal cyan.
        signal: {
          DEFAULT: '#820B1B',
          bright: '#A5162A',
          deep: '#690615',
          dark: '#4F0911',
        },

        // Status semantics for the CMS and live indicators.
        live: '#FF3B30',
        standby: '#F5A623',
        ready: '#226642',
      },

      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Editorial display scale, fluid between mobile and desktop.
        // Sized so the hero's two authored lines each stay on one line from the
        // tablet breakpoint up; below that they wrap, which is intended.
        'display-xl': ['clamp(2.5rem, 6.4vw, 6.5rem)', { lineHeight: '0.94', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2.25rem, 6vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(1.875rem, 4vw, 3.5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(1.5rem, 2.6vw, 2.25rem)', { lineHeight: '1.1', letterSpacing: '-0.015em' }],
        // Technical annotation scale.
        'tech-lg': ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.18em' }],
        tech: ['0.6875rem', { lineHeight: '1.45', letterSpacing: '0.22em' }],
        'tech-sm': ['0.625rem', { lineHeight: '1.4', letterSpacing: '0.26em' }],
      },

      spacing: {
        gutter: 'clamp(1.25rem, 3vw, 2.5rem)',
        section: 'clamp(5rem, 10vw, 10rem)',
      },

      maxWidth: {
        shell: '83rem',
        prose: '68ch',
      },

      borderColor: {
        hairline: 'rgba(93,68,45,0.14)',
        'hairline-strong': 'rgba(93,68,45,0.25)',
      },

      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },

      transitionDuration: {
        400: '400ms',
        600: '600ms',
        900: '900ms',
        1200: '1200ms',
      },

      transitionTimingFunction: {
        // Camera-move easing: slow to leave, decisive to arrive.
        cinematic: 'cubic-bezier(0.16, 1, 0.3, 1)',
        technical: 'cubic-bezier(0.65, 0, 0.35, 1)',
      },

      keyframes: {
        'signal-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.35', transform: 'scale(0.82)' },
        },
        'signal-sweep': {
          '0%': { transform: 'translateX(-110%)' },
          '100%': { transform: 'translateX(210%)' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0,1.25rem,0)' },
          to: { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        'marquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },

      animation: {
        'signal-pulse': 'signal-pulse 1.8s ease-in-out infinite',
        'signal-sweep': 'signal-sweep 4.5s cubic-bezier(0.16,1,0.3,1) infinite',
        scanline: 'scanline 7s linear infinite',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both',
        marquee: 'marquee 38s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
