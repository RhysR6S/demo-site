/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'slate-950': '#0f172a',
        'slate-900': '#1e293b',
        background: '#0f172a',
        primary: '#0ea5e9',
        secondary: '#0284c7',
      },
      backgroundColor: {
        'slate-950': '#0f172a',
        'slate-900': '#1e293b',
      }
    },
  },
  plugins: [],
}
