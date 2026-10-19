import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const FEATURES = ["today", "calendar", "journal", "todo", "settings", "onboarding"];

const featureBoundaryMessage =
  "Import other features only through their public API: '@/features/<name>' (index.ts).";

// src/app composes features and shared; nothing below it may depend on it (tests excepted).
const appLayerPattern = {
  group: ["@/app", "@/app/**"],
  message: "Features and shared code must not import from src/app (move the code to src/shared).",
};
const TEST_FILES = ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**"];

/** Deep imports of any feature, except the ones listed in `allowed`. */
const deepFeatureImports = (allowed = []) => [
  "@/features/*/*",
  ...allowed.map((name) => `!@/features/${name}/**`),
];

// Hex (#abc, #aabbcc, #aabbccdd) and rgb()/rgba() literals. Colors must come from theme tokens.
const HEX = String.raw`/(^|[^\w&])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/`;
const RGB = String.raw`/\brgba?\(/`;
const colorLiteralMessage =
  "Hardcoded colors are not allowed here. Use theme tokens (CSS variables / Tailwind token classes).";
const noColorLiterals = [
  "error",
  ...[HEX, RGB].flatMap((re) => [
    { selector: `Literal[value=${re}]`, message: colorLiteralMessage },
    { selector: `TemplateElement[value.raw=${re}]`, message: colorLiteralMessage },
  ]),
];

export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      "node_modules",
      "src-tauri",
      "playwright-report",
      "test-results",
      "docs",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Outside features: only the public index of a feature can be imported.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: deepFeatureImports(), message: featureBoundaryMessage }] },
      ],
    },
  },

  // shared/ never depends on features/.
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features", "@/features/**"],
              message: "src/shared must not import from src/features.",
            },
            appLayerPattern,
          ],
        },
      ],
    },
  },

  // Inside a feature: its own internals are allowed, other features only through their index.
  ...FEATURES.map((name) => ({
    files: [`src/features/${name}/**/*.{ts,tsx}`],
    ignores: TEST_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: deepFeatureImports([name]), message: featureBoundaryMessage },
            appLayerPattern,
          ],
        },
      ],
    },
  })),
  ...FEATURES.map((name) => ({
    files: TEST_FILES.map((glob) => glob.replace("src/", `src/features/${name}/`)),
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: deepFeatureImports([name]), message: featureBoundaryMessage }] },
      ],
    },
  })),

  // No hardcoded colors in features and the design system components.
  {
    files: ["src/features/**/*.{ts,tsx}", "src/shared/ui/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": noColorLiterals },
  },
);
