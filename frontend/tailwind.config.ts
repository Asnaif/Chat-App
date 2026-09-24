import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#2D6CDF",
          hover: "#3B7DF5",
          active: "#2458B3",
          light: "#EBF2FF",
          dark: "#1B4799",
        },
        dark: {
          bg: "#131722",
          surface: "#1B202D",
          card: "#232A3B",
          secondary: "#2A3142",
          border: "#2F374A",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#8E99A4",
          muted: "#5F6B7A",
        },
        accent: {
          green: "#00D68F",
          red: "#FF4757",
          amber: "#FFB020",
        },
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(45, 108, 223, 0.4)",
        card: "0 8px 32px 0 rgba(0, 0, 0, 0.36)",
      },
    },
  },
  plugins: [],
};
export default config;
