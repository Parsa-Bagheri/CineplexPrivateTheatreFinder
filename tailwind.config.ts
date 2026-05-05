import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        paper: "#f8f7f2",
        line: "#d8d4c8",
        gold: "#ffd500",
        spruce: "#0f5f55",
        berry: "#8a2340"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(17, 17, 17, 0.08), 0 8px 24px rgba(17, 17, 17, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
