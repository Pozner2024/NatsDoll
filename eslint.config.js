import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

const deepImportRule = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: [
            "**/features/*/*",
            "**/features/*/*/*",
            "**/widgets/*/*",
            "**/widgets/*/*/*",
            "**/shared/*/*",
          ],
          message:
            "Deep imports are forbidden. Use the feature/widget/shared public API (index.ts) instead. " +
            'For example: \'import { Component } from "@/features/cart"\' ' +
            'instead of \'import Component from "@/features/cart/ui/Component.vue"\'',
        },
      ],
    },
  ],
};

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.tsbuildinfo"],
  },

  // TypeScript base rules for .ts files
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ["**/*.ts"],
  })),

  // Vue flat-recommended — только для .vue файлов
  ...pluginVue.configs["flat/recommended"].map((cfg) => ({
    ...cfg,
    files: ["**/*.vue"],
  })),

  // Принудительно ставим vue-eslint-parser с TS-парсером для скриптов
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
    },
  },

  // Ослабляем строгие правила для тестов
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Запрет глубоких импортов — только для исходников приложений
  {
    files: ["apps/**/*.{ts,vue}"],
    rules: {
      ...deepImportRule,
    },
  },
];
