import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';


/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.browser, parser: '@typescript-eslint/parser' } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      // Add your custom rules here
      'no-console': 'warn', // Warns on console.log usage
      eqeqeq: 'error', // Enforces strict equality checks (=== and !==)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' }, // Ignore variables starting with "_"
      ],
    },
  },
];