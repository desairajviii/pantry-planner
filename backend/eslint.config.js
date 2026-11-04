import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier/flat";

export default [
  { ignores: ["node_modules/"] }, // skip installed packages
  js.configs.recommended, // ESLint's baseline rules
  { languageOptions: { globals: globals.node } }, // allow process, console, etc.
  prettier, // disable rules that fight Prettier
];
