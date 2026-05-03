import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-vite-plugin'
import path from "path"

export default defineConfig({
  plugins: [
    tanstackRouter(),
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    // Force client-side build only to ensure index.html exists for Vercel
    ssr: false,
    // ── Raise the warning threshold so you see real problems, not noise
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        // ── CORE FIX: Split every heavy dependency into its own chunk ──────
        manualChunks(id) {
          // 1. Charts (recharts / chart.js / d3 / victory)
          if (
            id.includes("recharts") ||
            id.includes("chart.js") ||
            id.includes("d3") ||
            id.includes("victory") ||
            id.includes("visx") ||
            id.includes("nivo")
          ) {
            return "vendor-charts";
          }

          // 2. UI component libraries (radix, shadcn, mui, antd, mantine)
          if (
            id.includes("@radix-ui") ||
            id.includes("@shadcn") ||
            id.includes("@mui") ||
            id.includes("antd") ||
            id.includes("@mantine") ||
            id.includes("@headlessui") ||
            id.includes("lucide-react") ||
            id.includes("@heroicons")
          ) {
            return "vendor-ui";
          }

          // 3. State management (redux, zustand, jotai, mobx)
          if (
            id.includes("redux") ||
            id.includes("zustand") ||
            id.includes("jotai") ||
            id.includes("mobx") ||
            id.includes("recoil") ||
            id.includes("@tanstack/react-query") ||
            id.includes("react-query")
          ) {
            return "vendor-state";
          }

          // 4. Forms (react-hook-form, formik, zod, yup)
          if (
            id.includes("react-hook-form") ||
            id.includes("formik") ||
            id.includes("zod") ||
            id.includes("yup") ||
            id.includes("@hookform")
          ) {
            return "vendor-forms";
          }

          // 5. Date/time utilities (date-fns, dayjs, moment, luxon)
          if (
            id.includes("date-fns") ||
            id.includes("dayjs") ||
            id.includes("moment") ||
            id.includes("luxon")
          ) {
            return "vendor-datetime";
          }

          // 6. Routing (react-router, tanstack-router)
          if (
            id.includes("react-router") ||
            id.includes("@tanstack/react-router")
          ) {
            return "vendor-router";
          }

          // 7. HTTP / data fetching (axios, swr, ky)
          if (
            id.includes("axios") ||
            id.includes("swr") ||
            id.includes(" ky/") ||
            id.includes("node_modules/ky")
          ) {
            return "vendor-http";
          }

          // 8. Animation (framer-motion, react-spring, gsap)
          if (
            id.includes("framer-motion") ||
            id.includes("react-spring") ||
            id.includes("gsap") ||
            id.includes("@react-spring")
          ) {
            return "vendor-animation";
          }

          // 9. Everything else in node_modules → "vendor-core" (React, ReactDOM, etc.)
          if (id.includes("node_modules")) {
            return "vendor-core";
          }

          // App code splits by feature folder automatically via dynamic imports
        },
      },
    },
  },
})
