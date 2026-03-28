import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "daycare-teal": "#0d9488",
        "daycare-teal-light": "#ccfbf1",
        "daycare-orange": "#f97316",
        "daycare-orange-light": "#ffedd5",
      },
    },
  },
  plugins: [],
};
export default config;
