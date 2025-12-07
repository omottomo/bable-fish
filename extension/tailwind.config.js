/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        'translation-bg': '#1a1a2e',
        'translation-text': '#eee',
        'overlay-border': '#0f3460',
        'accent': '#16213e'
      }
    },
  },
  plugins: [],
}
