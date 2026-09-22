import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

/**
 * The repo carried `// eslint-disable-next-line react-hooks/exhaustive-deps`
 * comments with no ESLint installed, so those suppressions were suppressing
 * nothing and the rule they name was never enforced.
 *
 * Rules are set at the level where they pay for themselves rather than at the
 * strictest setting: this is an existing codebase, and a config that reports
 * hundreds of findings on day one gets switched off.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'server/data/**',
      'data/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ─── Shared TypeScript rules ────────────────────────────────────────────────
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      // Unused values are usually a leftover from a refactor. Allow the
      // leading-underscore convention for intentionally-ignored params, which
      // the codebase already uses.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // `any` defeats the point of the type layer, but there are a handful of
      // legitimate uses at untyped boundaries — warn rather than block.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // ─── Client (React) ─────────────────────────────────────────────────────────
  {
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The two existing exhaustive-deps suppressions are deliberate
      // mount-once effects; keep the rule loud but non-blocking so it does not
      // gate CI on judgement calls.
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // The client may reuse server code only through the three aliases whose
      // modules are guaranteed pure (config, shared, types). A relative path
      // into server/ would pull in fs, pg or Express and break the bundle —
      // and it is how the duplicated types and cost functions started.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server/**', '../../server/*', '../../../server/*'],
              message:
                'Import shared server code via @carinfo/config, @carinfo/shared or @carinfo/types only.',
            },
          ],
        },
      ],
    },
  },

  // ─── Shared modules must stay pure ──────────────────────────────────────────
  // server/src/shared is bundled into the browser. Node built-ins or
  // server-only packages here would break the client build.
  {
    files: ['server/src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['fs', 'path', 'crypto', 'pg', 'express', 'axios', 'stripe', '@clerk/backend'].map(
            (name) => ({
              name,
              message: 'server/src/shared is bundled into the client; keep it pure.',
            }),
          ),
          patterns: [
            {
              group: ['node:*'],
              message: 'server/src/shared is bundled into the client; keep it pure.',
            },
            {
              group: [
                '../services/*',
                '../db/*',
                '../middleware/*',
                '../controllers/*',
                '../routes/*',
              ],
              message: 'server/src/shared may depend only on config/, types/ and pure utils/.',
            },
          ],
        },
      ],
    },
  },

  // ─── Server ─────────────────────────────────────────────────────────────────
  {
    files: ['server/**/*.{ts,mjs,cjs}', 'api/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // ─── Tests ──────────────────────────────────────────────────────────────────
  {
    files: ['**/*.test.{ts,tsx}', 'e2e/**/*.ts', '**/test/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // Tests legitimately reach for non-null assertions on fixtures.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // ─── Config and build scripts ───────────────────────────────────────────────
  {
    files: [
      '*.config.{js,mjs,ts}',
      '**/*.config.{js,mjs,ts}',
      'scripts/**/*.{js,mjs,ts}',
      'server/scripts/**/*.{ts,mjs,cjs}',
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Must stay last: turns off every rule that would fight the formatter.
  prettier,
);
