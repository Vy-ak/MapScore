/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#e9c77e",
        "secondary": "#73d9b5",
        "background": "#121416",
        "surface": "#121416",
        "surface-container": "#1e2022",
        "surface-container-high": "#282a2c",
        "surface-container-highest": "#333537",
        "surface-container-lowest": "#0c0e10",
        "surface-variant": "#333537",
        "on-background": "#e2e2e5",
        "on-surface": "#e2e2e5",
        "on-surface-variant": "#d0c5b4",
        "outline": "#999080",
        "outline-variant": "#4d4639",
      },
      fontFamily: {
        "body-md": ["Inter", "sans-serif"],
        "headline-lg": ["Hanken Grotesk", "sans-serif"],
        "headline-md": ["Hanken Grotesk", "sans-serif"],
        "display-lg": ["Hanken Grotesk", "sans-serif"],
        "label-md": ["Hanken Grotesk", "sans-serif"],
        "label-sm": ["Hanken Grotesk", "sans-serif"],
      },
      spacing: {
        "container-padding-desktop": "64px",
        "container-padding-mobile": "24px",
        "section-gap": "80px",
        "stack-lg": "32px",
        "stack-md": "16px",
        "stack-sm": "8px",
        "gutter": "24px",
      }
    },
  },
  plugins: [],
}