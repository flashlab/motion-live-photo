import react from "@vitejs/plugin-react";
import path from "path";
//import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import eslintPlugin from 'vite-plugin-eslint';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
    eslintPlugin({
      cache: false,
      include: ['./src//*.js', './src//*.jsx'],
      exclude: [],
    }),
    visualizer({
     open: true, // Opens the report in the browser
    }),
  ],
  optimizeDeps: {
    exclude: [
      "@ffmpeg/ffmpeg",
      "@ffmpeg/util",
      "@ffmpeg/core-mt",
      "@ffmpeg/core",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    assetsDir: "",
  },
});
