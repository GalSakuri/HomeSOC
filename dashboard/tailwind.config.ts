import type { Config } from "tailwindcss";

function socColor(name: string) {
  return `rgb(var(--soc-${name}) / <alpha-value>)`;
}

function shadcnColor(name: string) {
  return `rgb(var(--${name}) / <alpha-value>)`;
}

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        soc: {
          // Core surfaces
          bg:                socColor("bg"),
          surface:           socColor("surface"),
          "surface-high":    socColor("surface-high"),
          "surface-highest": socColor("surface-highest"),
          card:              socColor("card"),
          border:            socColor("border"),
          // Brand / semantic
          accent:            socColor("accent"),
          success:           socColor("success"),
          warning:           socColor("warning"),
          danger:            socColor("danger"),
          critical:          socColor("critical"),
          // Text
          text:              socColor("text"),
          muted:             socColor("muted"),
        },
        // shadcn/ui tokens
        background: shadcnColor("background"),
        foreground: shadcnColor("foreground"),
        card: {
          DEFAULT:    shadcnColor("card"),
          foreground: shadcnColor("card-foreground"),
        },
        primary: {
          DEFAULT:    shadcnColor("primary"),
          foreground: shadcnColor("primary-foreground"),
        },
        secondary: {
          DEFAULT:    shadcnColor("secondary"),
          foreground: shadcnColor("secondary-foreground"),
        },
        muted: {
          DEFAULT:    shadcnColor("muted"),
          foreground: shadcnColor("muted-foreground"),
        },
        accent: {
          DEFAULT:    shadcnColor("accent"),
          foreground: shadcnColor("accent-foreground"),
        },
        destructive: {
          DEFAULT:    shadcnColor("destructive"),
          foreground: shadcnColor("destructive-foreground"),
        },
        border: shadcnColor("border"),
        input:  shadcnColor("input"),
        ring:   shadcnColor("ring"),
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        none:    "0px",
        sm:      "0.125rem",
        DEFAULT: "0.25rem",
        md:      "0.375rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
