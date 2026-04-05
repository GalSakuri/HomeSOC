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
          bg: socColor("bg"),
          surface: socColor("surface"),
          card: socColor("card"),
          border: socColor("border"),
          accent: socColor("accent"),
          success: socColor("success"),
          warning: socColor("warning"),
          danger: socColor("danger"),
          critical: socColor("critical"),
          text: socColor("text"),
          muted: socColor("muted"),
        },
        background: shadcnColor("background"),
        foreground: shadcnColor("foreground"),
        card: {
          DEFAULT: shadcnColor("card"),
          foreground: shadcnColor("card-foreground"),
        },
        primary: {
          DEFAULT: shadcnColor("primary"),
          foreground: shadcnColor("primary-foreground"),
        },
        secondary: {
          DEFAULT: shadcnColor("secondary"),
          foreground: shadcnColor("secondary-foreground"),
        },
        muted: {
          DEFAULT: shadcnColor("muted"),
          foreground: shadcnColor("muted-foreground"),
        },
        accent: {
          DEFAULT: shadcnColor("accent"),
          foreground: shadcnColor("accent-foreground"),
        },
        destructive: {
          DEFAULT: shadcnColor("destructive"),
          foreground: shadcnColor("destructive-foreground"),
        },
        border: shadcnColor("border"),
        input: shadcnColor("input"),
        ring: shadcnColor("ring"),
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
