/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Brand Main
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        whatsapp: {
          light: '#dcfce7',
          DEFAULT: '#25D366',
          dark: '#128C7E',
        },
        overdue: {
          bg: '#FEE2E2',
          text: '#DC2626',
        },
        dueToday: {
          bg: '#FFEDD5',
          text: '#EA580C',
        },
        dueWeek: {
          bg: '#FEF3C7',
          text: '#D97706',
        },
      },
    },
  },
  plugins: [],
};
