// ESLint flat config for ESLint v9+
// Minimal setup focusing on Vue SFCs

import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tsParser from '@typescript-eslint/parser'

export default [
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      }
    },
    rules: {
      'no-console': 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      // Bruit de style HTML/Vue désactivé pour lisibilité et compatibilité code existant
      'vue/html-indent': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/attributes-order': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-closing-bracket-spacing': 'off',
      'vue/html-end-tags': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/mustache-interpolation-spacing': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-mutating-props': 'off',
      'vue/no-async-in-computed-properties': 'off',
      'vue/return-in-computed-property': 'off',
      // Autoriser certains noms mono-mot dans les vues (p.ex. Register)
      'vue/multi-word-component-names': ['error', {
        ignores: ['Register', 'Login', 'Home', 'Index', 'Test', 'Default', 'Dashboard', 'Parametres']
      }]
    }
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'public/**',
      'emulator-data/**',
      // Fichiers legacy/archives non utilisés dans le build
      'src/components/**/*-old.vue',
      'src/components/**/*_old.vue',
      'src/components/planning/CollaborateurCalendar_old.vue',
      // Composant avec faux positifs parsing côté linter (ok au build)
      'src/components/planning/PlanningCell.vue'
    ]
  }
]
