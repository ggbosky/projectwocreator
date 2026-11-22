import type { Config } from "tailwindcss";

const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: withAlpha("--bg"),
        surface: withAlpha("--surface"),
        elevated: withAlpha("--elevated"),
        border: withAlpha("--border"),
        fg: withAlpha("--fg"),
        muted: withAlpha("--muted"),
        subtle: withAlpha("--subtle"),
        brand: { DEFAULT: withAlpha("--brand"), soft: withAlpha("--brand-soft") },
        success: withAlpha("--success"),
        warning: withAlpha("--warning"),
        danger: withAlpha("--danger"),
        info: withAlpha("--info"),
      },
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", '"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      boxShadow: {
        glow: "0 8px 30px -8px rgb(var(--brand) / 0.55)",
        card: "0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 12px 40px -18px rgb(0 0 0 / 0.6)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { shimmer: "shimmer 1.6s infinite" },
    },
  },
  plugins: [],
} satisfies Config;
