import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const UI = ['react', 'react-dom', 'react/*', 'react-dom/*'];

export default tseslint.config(
  { ignores: ['node_modules', 'dist', 'coverage', 'site', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }] },
  },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      // The core holds every rule and stays UI-free: no React, no content compiler, no scripts.
      'no-restricted-imports': ['error', { patterns: [
        { group: UI, message: 'core must not depend on UI code' },
        { group: ['**/content/**', '**/content', '**/scripts/**'], message: 'core must not depend on content or scripts' },
        { group: ['**/app/**', '**/app'], message: 'core must not depend on the app' },
      ] }],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['**/scripts/**', '**/content/compile', '**/content/parse'], message: 'the app uses core and the compiled content only' }] }] },
  },
  {
    files: ['src/content/**/*.ts'],
    // The content compiler reads lesson files into core types: no UI, no app, no build scripts.
    rules: { 'no-restricted-imports': ['error', { patterns: [
      { group: UI, message: 'content must not depend on UI code' },
      { group: ['**/app/**', '**/app'], message: 'content must not depend on the app' },
      { group: ['**/scripts/**'], message: 'content must not depend on the build scripts' },
    ] }] },
  },
);
