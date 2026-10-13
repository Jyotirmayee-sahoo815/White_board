/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Outfit", "DM Sans", "system-ui", "sans-serif"],
        scribble: ["Caveat", "cursive"],
      },
      colors: {
        ink: {
          50: "#f7f5f2",
          900: "#16141f",
        },
      },
      boxShadow: {
        float: "0 18px 50px -20px rgba(79, 70, 229, 0.45)",
      },
    },
  },
  plugins: [],
};
