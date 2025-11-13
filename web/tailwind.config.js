/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        'pure-black': '#000000',
        background: '#000000',
      },
      backgroundColor: {
        'black': '#000000',
        'pure-black': '#000000',
      }
    },
  },
  plugins: [],
}
