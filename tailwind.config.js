/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'gold': '0 0 15px rgba(255, 215, 0, 0.5)',
        'silver': '0 0 15px rgba(192, 192, 192, 0.5)',
        'bronze': '0 0 15px rgba(205, 127, 50, 0.5)',
      },
    },
  },
  plugins: [],
}; 