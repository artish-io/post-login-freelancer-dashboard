/** @type {import('tailwindcss').Config} */
const { fontFamily } = require('tailwindcss/defaultTheme');
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        White: "#fff",
        Black: "#000",
        text: "#130e01",
        Green: "#30cb94",
      },
      fontFamily: {
  sans: ['var(--font-jakarta)', ...fontFamily.sans], // Now font-sans = Jakarta
  jakarta: ['var(--font-jakarta)'],
  "Text-Regular-Normal": ['"Plus Jakarta Sans"', ...fontFamily.sans],
  "button-medium": ["Roboto", ...fontFamily.sans],
},
      borderRadius: {
        borderRadius: "4px",
      },
      padding: {
        xl: "20px",
      },
      fontSize: {
        "-fontSize-0875rem": "14px",
        base: "16px",
        sm: "14px",
        inherit: "inherit",
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
