import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: {
        toplevel: true,
      },
    },
    // Heavy libraries get their own long-lived chunks so a route that never
    // touches 3D or charting never downloads them, and an app-code deploy does
    // not invalidate the vendor cache entries.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-core": ["@supabase/supabase-js"],
          "vendor-charts": ["recharts"],
          "vendor-three": ["three", "@react-three/fiber", "@react-three/drei"],
          "vendor-motion": ["framer-motion", "motion"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
}));
