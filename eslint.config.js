import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";

const deepImportRule = {
  "no-restricted-imports": [
    "warn",
    {
      patterns: [
        "**/features/*/*",
        "**/features/*/*/*",
        "**/global/*/*",
        "**/global/*/*/*",
        "**/shared/*/*",
      ],
      message:
        "Deep imports are forbidden. Use the feature/global public API (index.ts) instead. " +
        "For example: 'import { Component } from \"@/features/cart\"' " +
        "instead of 'import Component from \"@/features/cart/ui/Component.vue\"'",
    },
  ],
};

export default [
  // Ignore build artifacts
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  },

  // Vue 3 flat config (includes vue-eslint-parser + vue rules)
  ...pluginVue.configs["flat/recommended"],

  // TypeScript support for .ts and .vue files
  ...tseslint.configs.recommended,

  // Override parser for .vue files to keep vue-eslint-parser on top
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },

  // Project-wide rules
  {
    files: ["apps/**/*.{ts,vue}", "packages/**/*.ts"],
    rules: {
      ...deepImportRule,
    },
  },
];
