import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        },
        status: {
          compliant:  { bg: '#dcfce7', text: '#166534' },
          due:        { bg: '#fef9c3', text: '#854d0e' },
          overdue:    { bg: '#fee2e2', text: '#991b1b' },
          fault:      { bg: '#ffedd5', text: '#9a3412' },
          inactive:   { bg: '#f1f5f9', text: '#64748b' },
          unknown:    { bg: '#f8fafc', text: '#94a3b8' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
