import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // `vite build --mode artifact` → one self-contained HTML file (demo mode, in-memory routing).
  if (mode === "artifact") {
    return {
      base: "./",
      plugins: [react(), viteSingleFile()],
      resolve: { alias: { "@": path.resolve(__dirname, "src") } },
      define: {
        "import.meta.env.VITE_ROUTER": JSON.stringify("memory"),
        "import.meta.env.VITE_AUTH_MODE": JSON.stringify("demo"),
      },
      build: { outDir: "dist-artifact", sourcemap: false },
    };
  }
  return {
    // For GitHub Pages deploys set VITE_BASE_PATH=/projectwocreator/
    base: env.VITE_BASE_PATH || "/",
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    server: { port: 5173 },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            motion: ["framer-motion"],
            supabase: ["@supabase/supabase-js"],
          },
        },
      },
    },
  };
});
