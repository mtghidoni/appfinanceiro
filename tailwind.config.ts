import type { Config } from "tailwindcss";

// Tokens definidos em globals.css como canais OKLCH ("L C H")
const token = (name: string) => `oklch(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        bg:       token("bg"),
        card:     token("card"),
        border:   token("border"),
        apptext:  token("text"),
        muted:    token("muted"),
        thead:    token("thead"),
        rowhover: token("row-hover"),
        subtotal: token("subtotal"),
        heading:  token("heading"),
        // Cor da marca (accent é alias usado nos estados de foco)
        brand:    token("brand"),
        accent:   token("brand"),
        onbrand:  token("on-brand"),
        // Papéis semânticos
        income:   token("income"),
        expense:  token("expense"),
        danger:   token("danger"),
        warning:  token("warning"),
        "success-soft": token("success-soft"),
        "success-ink":  token("success-ink"),
        "warning-soft": token("warning-soft"),
        "warning-ink":  token("warning-ink"),
        "danger-soft":  token("danger-soft"),
        "danger-ink":   token("danger-ink"),
        "info-soft":    token("info-soft"),
        "info-ink":     token("info-ink"),
      },
      zIndex: {
        sticky: "10",
        overlay: "40",
        modal: "50",
        toast: "60",
      },
    },
  },
  plugins: [],
};
export default config;
