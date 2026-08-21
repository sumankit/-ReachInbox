import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          500: "#7c5cfc",
          600: "#6d3ef5",
          700: "#5b2fe0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
