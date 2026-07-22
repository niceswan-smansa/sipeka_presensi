import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#1e40af", light: "#3b82f6", dark: "#1e3a8a" },
        accent: { DEFAULT: "#f59e0b", light: "#fbbf24" },
        danger: { DEFAULT: "#dc2626", light: "#ef4444" },
        success: { DEFAULT: "#16a34a", light: "#22c55e" },
      },
    },
  },
  plugins: [],
};

export default config;
