import { defineConfig } from "vite";
export default defineConfig({ build: {
  target: "es2020", minify: "terser",
  lib: { entry: "src/index.ts", formats: ["es"], fileName: () => "miot-vacuum-map.js" },
  rollupOptions: { output: { codeSplitting: false } }
}});
