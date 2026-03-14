/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ctc: {
          blue: "#1a56db",
          gold: "#f59e0b",
        },
        th: {
          bg: "var(--th-bg)",
          card: "var(--th-card)",
          hover: "var(--th-hover)",
          border: "var(--th-border)",
          text1: "var(--th-text1)",
          text2: "var(--th-text2)",
          text3: "var(--th-text3)",
        },
      },
    },
  },
  plugins: [],
};
