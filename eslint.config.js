// @ts-check
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettierConfig from "eslint-config-prettier";

/**
 * Root flat ESLint config, monorepo-wide.
 *
 * Load-bearing rule: `packages/shared` (the pure domain package) must never
 * import a framework or I/O package. This is the mechanical enforcement of
 * the hexagonal boundary described in the design doc's "Placement rules".
 */
export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/.vite/**",
      "**/dev-dist/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
  {
    // Boundary guard: packages/shared must stay framework-free and I/O-free.
    // Test-infrastructure files (which verify this very guard by shelling
    // out to ESLint) are exempt — they are tooling, not domain code.
    files: ["packages/shared/**/*.ts"],
    ignores: ["packages/shared/**/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@nestjs/*", "@nestjs/**"],
              message: "packages/shared is pure domain and must not import NestJS.",
            },
            {
              group: ["react", "react-dom", "react/*", "react-dom/*"],
              message: "packages/shared is pure domain and must not import React.",
            },
            {
              group: ["pg", "pg-*"],
              message: "packages/shared is pure domain and must not perform Postgres I/O.",
            },
            {
              group: ["fs", "node:fs", "fs/*", "node:fs/*"],
              message: "packages/shared is pure domain and must not perform filesystem I/O.",
            },
          ],
        },
      ],
    },
  },
  {
    // Boundary guard: apps/web must consume domain shapes from @kutana/shared,
    // never redeclare its own copies of domain model types.
    files: ["apps/web/src/**/*.ts", "apps/web/src/**/*.tsx"],
    ignores: ["apps/web/src/design-system/tokens/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "TSInterfaceDeclaration[id.name=/^(Product|Category|Order|LineItem|Ticket|Allocation|Payment|StockItem|Sale|Customer)$/]",
          message:
            "Do not locally redeclare domain shapes in apps/web — import them from @kutana/shared instead.",
        },
      ],
    },
  },
  {
    // Design-system guard: raw hex colors only allowed inside tokens/.
    files: ["apps/web/src/**/*.ts", "apps/web/src/**/*.tsx", "apps/web/src/**/*.css"],
    ignores: ["apps/web/src/design-system/tokens/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/]",
          message:
            "Raw hex colors are only allowed in design-system/tokens/. Use a role-named token instead.",
        },
      ],
    },
  },
  prettierConfig,
];
