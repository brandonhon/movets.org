/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./site/**/*.html", "./site/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        primary: {
          1: "#FF344C",
          2: "#26385E",
        },
        secondary: {
          1: "#FFEFF1",
          2: "#DC1E35",
          3: "#EDEFF5",
          4: "#1F3584",
        },
        neutral: {
          800: "#0E121E",
          700: "#53565E",
          600: "#717379",
          500: "#BEC1C8",
          400: "#E0E2E7",
          300: "#F2F2F4",
          200: "#F7F8F9",
          100: "#FFFFFF",
        },
      },
      fontFamily: {
        heading: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      fontSize: {
        "display-1": ["114px", { lineHeight: "107px" }],
        "h1": ["56px", { lineHeight: "66px" }],
        "h2": ["38px", { lineHeight: "50px" }],
        "h3": ["24px", { lineHeight: "34px" }],
        "h4": ["22px", { lineHeight: "28px" }],
        "h5": ["18px", { lineHeight: "24px" }],
        "h6": ["16px", { lineHeight: "22px" }],
        "paragraph-lg": ["24px", { lineHeight: "38px" }],
        "paragraph": ["18px", { lineHeight: "30px" }],
        "paragraph-sm": ["14px", { lineHeight: "24px" }],
      },
    },
  },
  plugins: [],
}
