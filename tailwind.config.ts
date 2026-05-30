import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4f0',
          100: '#e4e9e3',
          200: '#d8f2da',
          300: '#b8e6bb',
          400: '#72c278',
          500: '#4e9955',
          600: '#2d5c33',
          700: '#1a3a1f',
          800: '#142d18',
          900: '#0d1f10',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
