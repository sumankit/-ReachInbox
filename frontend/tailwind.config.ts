import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ef",
          100: "#dcefdd",
          200: "#b8dfba",
          500: "#4caf50",
          600: "#43a047",
          700: "#2e7d32",
        },
      },
    },
  },
  plugins: [],
};

export default config;
