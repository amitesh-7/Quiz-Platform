/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Monochrome primary palette
        primary: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
        glass: {
          light: "rgba(255, 255, 255, 0.05)",
          medium: "rgba(255, 255, 255, 0.1)",
          dark: "rgba(255, 255, 255, 0.15)",
        },
        // Shader-themed colors (monochrome)
        shader: {
          accent: "#ffffff",
          glow: "#a3a3a3",
          dark: "#000000",
          gray: "#1a1a1a",
        },
        // Design system colors (monochrome)
        background: "rgb(0, 0, 0)",
        foreground: "rgb(255, 255, 255)",
        card: "rgba(255, 255, 255, 0.05)",
        "card-foreground": "rgb(255, 255, 255)",
        popover: "rgba(0, 0, 0, 0.9)",
        "popover-foreground": "rgb(255, 255, 255)",
        secondary: "rgb(51, 51, 51)",
        "secondary-foreground": "rgb(255, 255, 255)",
        muted: "rgba(255, 255, 255, 0.5)",
        "muted-foreground": "rgb(163, 163, 163)",
        accent: "#ffffff",
        "accent-foreground": "rgb(0, 0, 0)",
        destructive: "rgb(239, 68, 68)",
        "destructive-foreground": "rgb(255, 255, 255)",
        border: "rgba(255, 255, 255, 0.1)",
        input: "rgba(255, 255, 255, 0.05)",
        ring: "rgba(255, 255, 255, 0.2)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        "shader-glow": "shaderGlow 4s ease-in-out infinite",
        "shader-pulse": "shaderPulse 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shaderGlow: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        shaderPulse: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" },
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};
