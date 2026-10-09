import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', '.claude/', '.vercel/'] },
  js.configs.recommended,
  { files: ['**/*.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node } } },
];
