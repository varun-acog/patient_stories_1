/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      primary: '#1B4965',
      secondary: '#62B6CB',
      background: '#F5F7FA',
      card: '#FFFFFF',
      text: '#2D3748',
      success: '#38A169',
      warning: '#D69E2E',
      error: '#E53E3E',
    },
    extend: {},
  },
  plugins: [],
};