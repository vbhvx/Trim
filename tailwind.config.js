/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        brand: {
          50: "#eef8ff",
          100: "#d8eeff",
          200: "#b9e2ff",
          300: "#88d1ff",
          400: "#50b7fc",
          500: "#2798f5",
          600: "#137ce8",
          700: "#0e62cb",
          800: "#1150a4",
          900: "#144482",
          950: "#0d2b53",
        },
      },
    },
  },
  plugins: [],
};

