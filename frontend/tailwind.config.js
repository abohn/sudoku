/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ctc: {
          blue: "#1a56db",
          gold: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
