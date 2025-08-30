import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Performance optimizations for development
    ignores: [
      "data/**/*",
      "scripts/**/*",
      "**/*.test.{js,jsx,ts,tsx}",
      "**/*.spec.{js,jsx,ts,tsx}",
      "__tests__/**/*",
      "coverage/**/*",
      ".next/**/*",
      "dist/**/*",
      "build/**/*",
      "node_modules/**/*",
      "uploads/**/*",
      "public/**/*"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      // Disable expensive rules during development
      ...(process.env.NODE_ENV === 'development' && {
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/no-misused-promises": "off",
        "@typescript-eslint/require-await": "off",
        "react-hooks/exhaustive-deps": "warn", // Downgrade from error
      }),
    },
  },
];

export default eslintConfig;
