import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "dist/**", "backend/**/dist/**", "frontend/**/dist/**"],
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
    },
  },
];
