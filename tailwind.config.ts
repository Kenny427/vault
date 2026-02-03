import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'osrs-bg': '#0f1929',
        'osrs-accent': '#d4a574',
      },
    },
  },
  plugins: [],
}
export default config
