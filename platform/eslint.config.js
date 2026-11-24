import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const UI = ['react', 'react-dom', 'react/*', 'react-dom/*'];

export default tseslint.config(
  { ignores: ['node_modules', 'dist', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/core/**/*.ts'],
    rules: {
      // The core holds every rule and stays UI-free: no React, no content compiler, no scripts.
      'no-restricted-imports': ['error', { patterns: [
        { group: UI, message: 'core must not depend on UI code' },
        { group: ['**/content/**', '**/content', '**/scripts/**'], message: 'core must not depend on content or scripts' },
      ] }],
    },
  },
  {
    files: ['src/content/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: UI, message: 'content must not depend on UI code' }] }] },
  },
);
