import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
		...globals.jquery,
		"d3": true,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      "no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      eqeqeq: ["error", "smart"],
      "no-mixed-operators": "error",
      "no-cond-assign": "error",
      "no-loop-func": "error",
      "no-throw-literal": "error",
      "no-new-object": "error",
      "no-useless-concat": "error",
      "no-lone-blocks": "error",
      "no-empty": "error"
    },
  },
]
