// ESLint flat config for Vue + TS + Prettier
import vue from 'eslint-plugin-vue'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import prettier from 'eslint-config-prettier'

export default [
  {
    files: ['**/*.{ts,tsx,vue}'],
    ignores: ['dist/**', 'node_modules/**', 'emulator-data/**'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: { window: true, document: true, console: true },
    },
    plugins: { vue, '@typescript-eslint': ts },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  prettier,
]
