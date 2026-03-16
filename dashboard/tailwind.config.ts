import type { Config } from "tailwindcss";

function socColor(name: string) {
  return `rgb(var(--soc-${name}) / <alpha-value>)`;
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
      },
    },
  },
  plugins: [],
} satisfies Config;
