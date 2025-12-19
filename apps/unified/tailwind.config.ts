import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "#111111",
        border: "rgba(255, 255, 255, 0.1)",
        primary: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          active: "#4338CA",
        },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        foreground: {
          DEFAULT: "#FFFFFF",
          muted: "rgba(255, 255, 255, 0.6)",
          subtle: "rgba(255, 255, 255, 0.4)",
        },
      },
      borderRadius: {
        DEFAULT: "12px",
        sm: "10px",
        md: "12px",
        lg: "14px",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        geist: ["Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tighter: "-0.02em",
        widest: "0.1em",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
export default config;

