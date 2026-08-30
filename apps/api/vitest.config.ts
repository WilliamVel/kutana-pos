import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

/**
 * NestJS DI relies on `emitDecoratorMetadata`, which esbuild (Vite/Vitest's
 * default transformer) does not emit. swc does, via unplugin-swc's Vite
 * plugin — see design decision "Vitest for the whole monorepo" for context.
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
