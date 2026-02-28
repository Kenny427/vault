import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colors - Design tokens synced with CSS variables
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
        
        // Secondary - Cyan/teal
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
        'osrs-bg': '#0f1929',
        'osrs-accent': '#d4a574',
      },
      
      // Typography
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
        black: 'var(--font-black)',
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
      
      // Shadows - Enhanced with glow effects
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        // Glow variants
        'glow-accent': '0 0 12px var(--glow-accent)',
        'glow-accent-strong': '0 0 20px var(--glow-accent-strong)',
        'glow-secondary': '0 0 12px var(--glow-secondary)',
        'glow-secondary-strong': '0 0 20px var(--glow-secondary-strong)',
        'glow-danger': '0 0 12px var(--glow-danger)',
        'glow-warning': '0 0 12px var(--glow-warning)',
        // Card glow
        'card': 'var(--card-glow)',
        'card-hover': 'var(--card-glow-hover)',
      },
      
      // Transitions
      transitionDuration: {
        fast: 'var(--transition-fast)',
        DEFAULT: 'var(--transition-base)',
        slow: 'var(--transition-slow)',
        slower: 'var(--transition-slower)',
      },
      
      // Animation
      animation: {
        'fade-in': 'fadeIn 150ms ease',
        'slide-up': 'slideUp 200ms ease',
        'slide-down': 'slideDown 200ms ease',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-glow-secondary': 'pulseGlowSecondary 2s ease-in-out infinite',
        'data-flow': 'dataFlow 3s ease-in-out infinite',
      },
      
      // Keyframe animations (extend)
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px var(--glow-accent), 0 0 10px var(--glow-accent)' },
          '50%': { boxShadow: '0 0 10px var(--glow-accent-strong), 0 0 20px var(--glow-accent)' },
        },
        pulseGlowSecondary: {
          '0%, 100%': { boxShadow: '0 0 5px var(--glow-secondary), 0 0 10px var(--glow-secondary)' },
          '50%': { boxShadow: '0 0 10px var(--glow-secondary-strong), 0 0 20px var(--glow-secondary)' },
        },
        dataFlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scaleX(0.8)' },
          '50%': { opacity: '1', transform: 'scaleX(1)' },
        },
      },
      
      // Background image (for gradients)
      backgroundImage: {
        'surface-gradient': 'linear-gradient(145deg, var(--color-surface-2) 0%, var(--color-surface) 100%)',
        'glow-radial-accent': 'radial-gradient(ellipse at 50% 0%, var(--glow-accent) 0%, transparent 60%)',
        'glow-radial-secondary': 'radial-gradient(ellipse at 80% 20%, var(--glow-secondary) 0%, transparent 40%)',
      },
    },
  },
  plugins: [],
}
export default config
