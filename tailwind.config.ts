import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colors - Futuristic Terminal Design Tokens
      colors: {
        // Base
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          2: 'var(--color-surface-2)',
          3: 'var(--color-surface-3)',
          4: 'var(--color-surface-4)',
        },
        
        // Text
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        
        // Accent - OSRS gold/amber
        accent: {
          DEFAULT: 'var(--color-accent)',
          2: 'var(--color-accent-2)',
          muted: 'var(--color-accent-muted)',
        },
        
        // Secondary - Cyan/teal for tech feel
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          2: 'var(--color-secondary-2)',
          muted: 'var(--color-secondary-muted)',
        },
        
        // Semantic
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        
        // Border
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
          accent: 'var(--color-border-accent)',
        },
        
        // Legacy OSRS colors (keep for compatibility)
        'osrs-bg': '#0a0c10',
        'osrs-accent': '#d4a753',
      },
      
      // Typography - Terminal-style monospace
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      
      fontSize: {
        'xs': ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],
        'sm': ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
        'base': ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        'lg': ['var(--text-lg)', { lineHeight: 'var(--leading-snug)' }],
        'xl': ['var(--text-xl)', { lineHeight: 'var(--leading-snug)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-tight)' }],
      },
      
      fontWeight: {
        normal: 'var(--font-normal)',
        medium: 'var(--font-medium)',
        semibold: 'var(--font-semibold)',
        bold: 'var(--font-bold)',
        extrabold: 'var(--font-extrabold)',
      },
      
      letterSpacing: {
        tighter: 'var(--tracking-tight)',
        normal: 'var(--tracking-normal)',
        wide: 'var(--tracking-wide)',
        wider: 'var(--tracking-wider)',
        widest: 'var(--tracking-widest)',
      },
      
      // Spacing
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      
      // Border radius
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      
      // Shadows + Glows
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        'glow-accent': '0 0 10px var(--glow-accent), 0 0 20px var(--glow-accent)',
        'glow-secondary': '0 0 10px var(--glow-secondary), 0 0 20px var(--glow-secondary)',
        'glow-danger': '0 0 10px var(--glow-danger)',
        'card': 'var(--card-glow)',
        'card-hover': 'var(--card-glow-hover)',
      },
      
      // Transitions
      transitionDuration: {
        fast: 'var(--transition-fast)',
        DEFAULT: 'var(--transition-base)',
        slow: 'var(--transition-slow)',
      },
      
      // Animation
      animation: {
        'fade-in': 'fadeIn 150ms ease',
        'slide-up': 'slideUp 200ms ease',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
