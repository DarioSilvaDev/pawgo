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
        primary: {
          turquoise: '#00CED1',
          'turquoise-dark': '#00A8A8',
          'turquoise-light': '#40E0D0',
        },
        text: {
          black: '#000000',
          'dark-gray': '#1F2937',
          gray: '#6B7280',
        },
        background: {
          white: '#FFFFFF',
          'light-gray': '#F9FAFB',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;

