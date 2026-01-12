import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      /* -------------------------------------------------
         COLORS — mapped directly to AI Studio tokens
         ------------------------------------------------- */
      colors: {
        /* Backgrounds / Surfaces */
        void: "var(--bg-void)",
        glass: "var(--bg-glass)",
        raised: "var(--bg-raised)",
        active: "var(--bg-active)",

        /* Text */
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",

        /* Accents */
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          success: "var(--accent-success)",
          warning: "var(--accent-warning)",
          error: "var(--accent-error)",
        },

        /* Borders */
        border: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
          highlight: "var(--border-highlight)",
        },
      },

      /* -------------------------------------------------
         RADIUS — token driven
         ------------------------------------------------- */
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },

      /* -------------------------------------------------
         SHADOWS — HUD subtlety
         ------------------------------------------------- */
      boxShadow: {
        soft: "var(--shadow-soft)",
        glass: "var(--shadow-glass)",
      },

      /* -------------------------------------------------
         MOTION
         ------------------------------------------------- */
      transitionTimingFunction: {
        default: "var(--ease-default)",
      },

      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
      },

      /* -------------------------------------------------
         BLUR — glass
         ------------------------------------------------- */
      backdropBlur: {
        glass: "var(--glass-blur)",
      },

      /* -------------------------------------------------
         TYPOGRAPHY - Premium, dense, high-end feel
         ------------------------------------------------- */
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1" }], // 10px
        xs: ["0.75rem", { lineHeight: "1.1" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.25" }], // 14px
        base: ["1rem", { lineHeight: "1.4" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.3" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.2" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "1.1" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "1" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "0.95" }], // 36px
        "5xl": ["3rem", { lineHeight: "0.92" }], // 48px
      },

      letterSpacing: {
        tightest: "-0.05em",
        tighter: "-0.04em",
        tight: "-0.02em",
        normal: "0",
        wide: "0.05em",
        wider: "0.08em",
        widest: "0.12em",
      },

      lineHeight: {
        none: "1",
        tightest: "0.9",
        tight: "1.1",
        snug: "1.25",
        normal: "1.4",
        relaxed: "1.5",
      },

      /* -------------------------------------------------
         SPACING (keep what’s useful)
         ------------------------------------------------- */
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
    },
  },

  plugins: [],
};

export default config;