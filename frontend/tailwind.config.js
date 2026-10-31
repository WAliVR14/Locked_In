/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nopal: {
          DEFAULT: "#176B57", // Primary: Nopal green
          dark: "#0F4C3D",
          light: "#228B72",
        },
        cempasuchil: {
          DEFAULT: "#F45116", // Primary accent: Marigold orange
          dark: "#D13E09",
          light: "#FF703B",
        },
        crema: {
          DEFAULT: "#FFF4D6", // Base background: Warm paper-toned cream
          paper: "#FFF9E8",   // Raised surface for cards and boards
          sunken: "#F5E6BE",  // Secondary backgrounds / disabled inputs
        },
        tinta: {
          DEFAULT: "#493725", // Main text and borders: Dark ink-brown
          muted: "#755B43",   // Secondary text / supporting labels
          soft: "#A38B73",    // Subtle borders and placeholders
        },
        oliva: {
          DEFAULT: "#777D00", // Complementary: Olive green
          light: "#959C1A",
        },
        maiz: {
          DEFAULT: "#F3DC79", // Complementary: Corn yellow
          soft: "#FAF0BE",
        },
        semantic: {
          success: "#176B57", // Revenue / Completed (Harmonized with Nopal)
          warning: "#B85D00", // Legible warning on a maize/cream background
          danger: "#B92B1B",  // Expenses / Overdue debt / Error (Traditional carmine red)
          info: "#1D5B79",    // Information / Transfers (Indigo blue)
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        vintage: "4px 4px 0px 0px #493725",
        "vintage-sm": "2px 2px 0px 0px #493725",
        "vintage-lg": "6px 6px 0px 0px #493725",
      },
    },
  },
  plugins: [],
};