import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Same philosophy as backend/eslint.config.mjs: catches the class of mistake
 * that `vite build` and JSX parsing both miss - a component used without
 * being imported still parses fine and still builds; it only breaks the
 * moment someone renders that screen. `no-undef` (JSX-aware, since espree
 * parses `<Foo />` as a reference to `Foo`) is the rule that catches it, so
 * it is an error and most style opinions are left as warnings or off - a
 * lint run nobody trusts gets ignored, and the useful rule goes with it.
 *
 * This file existing at all is itself the fix for a real gap: there was no
 * eslint.config.* here before, so `npx eslint .` errored out on a missing
 * config instead of linting anything, and CI's `npx eslint . || true`
 * "passed" regardless of what the code looked like.
 */
export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly',
        console: 'readonly', fetch: 'readonly', localStorage: 'readonly',
        sessionStorage: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly', requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
        AbortController: 'readonly', FormData: 'readonly', Blob: 'readonly',
        File: 'readonly', FileReader: 'readonly', Image: 'readonly',
        WebSocket: 'readonly', Notification: 'readonly', CustomEvent: 'readonly', Event: 'readonly',
        IntersectionObserver: 'readonly', ResizeObserver: 'readonly', MutationObserver: 'readonly',
        alert: 'readonly', confirm: 'readonly', prompt: 'readonly',
        history: 'readonly', location: 'readonly', screen: 'readonly',
        crypto: 'readonly', performance: 'readonly', queueMicrotask: 'readonly',
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // The rule that catches real defects stays an error and fails CI.
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-self-assign': 'error',
      'no-const-assign': 'error',
      // Calling a hook conditionally/in a loop breaks React's state
      // bookkeeping outright - always a real bug, never a style choice.
      'react-hooks/rules-of-hooks': 'error',

      // Style opinions stay warnings, same reasoning as the backend config -
      // a gate that fails a build over an unused variable teaches people to
      // stop trusting (and eventually stop running) the gate. exhaustive-deps
      // does catch real stale-closure bugs, but the codebase already has many
      // deliberate `// eslint-disable-next-line react-hooks/exhaustive-deps`
      // overrides for effects that intentionally run once - a warning
      // (rather than an error blocking every one of those) is what makes
      // those existing disable comments meaningful instead of noise.
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-empty': 'off',
      'no-constant-condition': ['error', { checkLoops: false }],
    },
  },
  {
    files: ['**/*.mjs', 'eslint.config.mjs', 'vite.config.js', 'postcss.config.js', 'tailwind.config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module' },
  },
  { ignores: ['node_modules/**', 'dist/**', 'build/**'] },
];
