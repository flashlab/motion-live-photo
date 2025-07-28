import { defineConfig } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    {
        extends: fixupConfigRules(compat.extends(
            "eslint:recommended",
            "plugin:react/recommended",
            "plugin:react-hooks/recommended",
            "plugin:@typescript-eslint/recommended-type-checked",
            "plugin:react/jsx-runtime",
        )),

        plugins: {
            react: fixupPluginRules(react),
            "react-hooks": fixupPluginRules(reactHooks),
        },

        languageOptions: {
            globals: {
                ...globals.browser,
            },

            ecmaVersion: 2020,
            sourceType: "module",

            parserOptions: {
                project: ["./tsconfig.json", "./tsconfig.node.json"],

                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        ignores: ["vite.config.ts"],
        rules: {
            "react/react-in-jsx-scope": "off",
        },
    },
    // Exclude this config file from TS project linting
    {
        files: ["eslint.config.mjs"],
        languageOptions: {
            parserOptions: {
                project: null,
            },
        },
    }
]);