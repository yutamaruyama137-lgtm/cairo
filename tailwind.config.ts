import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "sans-serif"],
      },
      colors: {
        cream: {
          50: "#FFFDF7",
          100: "#FDF8EE",
          200: "#FAF0DC",
        },
        warm: {
          50: "#FFF9F0",
          100: "#FEF3E2",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 20px rgba(0,0,0,0.06)",
        "soft-lg": "0 4px 30px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
